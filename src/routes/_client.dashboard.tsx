import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/Icon";
import { buttonClass, fieldClass, labelClass } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import {
  updateConsultationLocation,
  getCustomerLocation,
  updateCustomerLocation,
  deleteConsultation,
  updateConsultation,
} from "@/lib/public.functions";
import { siteDataQuery } from "@/lib/site-queries";
import { SiteFooter } from "@/components/site/SiteFooter";
import { ConsultationForm } from "@/components/consultation/ConsultationForm";

type GooglePlaceLocation = {
  lat: () => number;
  lng: () => number;
};

type GooglePlace = {
  fetchFields: (options: { fields: string[] }) => Promise<void>;
  formattedAddress?: string;
  location?: GooglePlaceLocation;
  id?: string;
};

type GooglePlacePrediction = {
  toPlace: () => GooglePlace;
};

type GooglePlaceSelectEvent = CustomEvent<{
  placePrediction?: GooglePlacePrediction;
}>;

type GooglePlacesLibrary = {
  PlaceAutocompleteElement: new () => HTMLElement;
};

type GoogleMaps = {
  importLibrary: (library: "places") => Promise<GooglePlacesLibrary>;
};

type GoogleWindow = {
  maps?: GoogleMaps;
};

declare global {
  interface Window {
    google?: GoogleWindow;
  }
}

export const Route = createFileRoute("/_client/dashboard")({
  component: DashboardPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      tab: (search["tab"] as string) || "consultations",
    };
  },
});

function DashboardPage() {
  const { tab } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const { data: userAuth } = useSuspenseQuery({
    queryKey: ["auth", "user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error("Not logged in");
      return data.user;
    },
  });

  const { data: profile } = useSuspenseQuery({
    queryKey: ["profile", userAuth.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", userAuth.id).single();
      return data;
    },
  });

  const { data: consultations } = useSuspenseQuery({
    queryKey: ["consultations", userAuth.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("consultations")
        .select("*")
        .eq("user_id", userAuth.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: siteData } = useSuspenseQuery(siteDataQuery);
  const [editingConsultationId, setEditingConsultationId] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteConsultation({ data: { consultationId: id } });
    },
    onSuccess: () => {
      toast.success("Consultation deleted successfully.");
      qc.invalidateQueries({ queryKey: ["consultations", userAuth.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // const updateMutation = useMutation({
  //   mutationFn: async (data: any) => {
  //     await updateConsultation({ data });
  //   },
  type ConsultationUpdateData = {
    consultationId: string;
    service_interest: string;
    project_type: string;
    project_scope: string;
    timeline: string;
    budget_range: string | null;
    location: string | null;
    property_address: string | null;
    preferred_date: string | null;
    preferred_time: string;
    message: string | null;
  };

  const updateMutation = useMutation({
    mutationFn: async (data: ConsultationUpdateData) => {
      await updateConsultation({
        data,
      });
    },

    onSuccess: () => {
      toast.success("Consultation updated successfully.");
      setEditingConsultationId(null);
      qc.invalidateQueries({ queryKey: ["consultations", userAuth.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: myLocation, refetch: refetchLocation } = useSuspenseQuery({
    queryKey: ["myLocation", userAuth.id],
    queryFn: async () => {
      try {
        const loc = await getCustomerLocation();
        return loc;
      } catch (err) {
        return null;
      }
    },
  });

  const locationMutation = useMutation({
    mutationFn: async (coords: {
      latitude: number;
      longitude: number;
      accuracy: number | null;
    }) => {
      await updateCustomerLocation({ data: coords });
    },
    onSuccess: () => {
      toast.success("Location updated successfully.");
      refetchLocation();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleShareLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }
    toast.info("Requesting location access...");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        locationMutation.mutate({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        let msg = "Location could not be determined.";
        if (err.code === err.PERMISSION_DENIED) {
          msg = "Location permission was denied.";
        }
        toast.error(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  const profileMutation = useMutation({
    mutationFn: async (fd: FormData) => {
      const updates = {
        full_name: String(fd.get("full_name") || ""),
        phone: String(fd.get("phone") || "") || null,
      };
      const { error } = await supabase.from("profiles").update(updates).eq("id", userAuth.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["profile", userAuth.id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <h1 className="mb-2 font-headline-md text-headline-md text-primary">Client Portal</h1>
      <p className="mb-10 font-body-lg text-body-lg text-on-surface-variant">
        Manage your design consultations and profile.
      </p>

      <div className="flex gap-2 border-b border-outline-variant/50">
        {(["consultations", "profile"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => navigate({ to: ".", search: { tab: t } })}
            className={`px-5 py-3 font-label-caps text-label-caps uppercase tracking-widest transition-colors ${
              tab === t ? "border-b-2 border-secondary text-primary" : "text-on-surface-variant"
            }`}
          >
            {t === "consultations" ? "My Consultations" : "Profile Settings"}
          </button>
        ))}
      </div>

      <div className="mt-10 max-w-4xl">
        {tab === "consultations" && (
          <div className="space-y-6">
            {consultations.length === 0 ? (
              <div className="border border-outline-variant/60 bg-surface-container-lowest p-12 text-center">
                <p className="font-body-lg text-body-lg text-on-surface-variant">
                  You have no active consultations.
                </p>
                <button
                  onClick={() => navigate({ to: "/consultation" })}
                  className={`mt-6 ${buttonClass}`}
                >
                  Book a Consultation
                </button>
              </div>
            ) : (
              consultations.map((c) => {
                if (editingConsultationId === c.id) {
                  return (
                    <div
                      key={c.id}
                      className="border border-outline-variant/60 bg-surface-container-lowest p-8"
                    >
                      <ConsultationForm
                        mode="edit"
                        saving={updateMutation.isPending}
                        services={siteData.services}

                        // initialData={c as any}
                        initialData={{
                          service_interest: c.service_interest ?? "",
                          project_type: c.project_type ?? "",
                          project_scope: c.project_scope ?? "",
                          timeline: c.timeline ?? "",
                          budget_range: c.budget_range ?? "",
                          location: c.location ?? "",
                          property_address: c.property_address ?? "",
                          preferred_date: c.preferred_date ?? "",
                          preferred_time: c.preferred_time ?? "",
                          message: c.message ?? "",
                        }}
                        onSubmit={(data) =>
                          updateMutation.mutate({ ...data, consultationId: c.id })
                        }
                        onCancel={() => setEditingConsultationId(null)}
                      />
                    </div>
                  );
                }

                return (
                  <div
                    key={c.id}
                    className="border border-outline-variant/60 bg-surface-container-lowest p-8"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-headline-md text-[20px] text-primary">
                          {c.service_interest}
                        </h3>
                        <p className="mt-1 font-body-md text-on-surface-variant">
                          {c.project_type} · {c.project_scope}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="inline-block bg-surface-container px-3 py-1 font-label-caps text-xs uppercase tracking-widest text-primary">
                          {c.status}
                        </span>
                        <button
                          onClick={() => setEditingConsultationId(c.id)}
                          className="font-label-caps text-xs text-secondary hover:text-primary transition-colors uppercase tracking-widest"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            if (
                              window.confirm("Are you sure you want to delete this consultation?")
                            ) {
                              deleteMutation.mutate(c.id);
                            }
                          }}
                          className="font-label-caps text-xs text-error hover:text-error/80 transition-colors uppercase tracking-widest"
                          disabled={deleteMutation.isPending}
                        >
                          {deleteMutation.isPending ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </div>
                    <div className="mt-6 grid grid-cols-2 gap-6 border-t border-outline-variant/40 pt-6">
                      <div>
                        <p className="mb-1 font-label-caps text-[10px] uppercase tracking-widest text-on-surface-variant">
                          Preferred Date
                        </p>
                        <p className="font-body-md text-primary">
                          {c.preferred_date ? `${c.preferred_date} · ${c.preferred_time}` : "TBD"}
                        </p>
                      </div>
                      <div>
                        <p className="mb-1 font-label-caps text-[10px] uppercase tracking-widest text-on-surface-variant">
                          Location
                        </p>
                        <p className="font-body-md text-primary">
                          {c.property_formatted_address || c.location || "N/A"}
                        </p>

                        <div className="mt-4">
                          <LocationEditor
                            consultationId={c.id}
                            initialAddress={c.property_formatted_address || ""}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === "profile" && (
          <>
            <form
              className="border border-outline-variant/60 bg-surface-container-lowest p-8"
              onSubmit={(e) => {
                e.preventDefault();
                profileMutation.mutate(new FormData(e.currentTarget));
              }}
            >
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Full Name</label>
                  <input
                    name="full_name"
                    defaultValue={profile?.full_name || ""}
                    className={`${fieldClass} mt-2`}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Phone Number</label>
                  <input
                    name="phone"
                    defaultValue={profile?.phone || ""}
                    className={`${fieldClass} mt-2`}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Email Address (Read-only)</label>
                  <input
                    value={userAuth.email || ""}
                    readOnly
                    disabled
                    className={`${fieldClass} mt-2 opacity-60`}
                  />
                </div>
              </div>
              <button
                type="submit"
                className={`${buttonClass} mt-8`}
                disabled={profileMutation.isPending}
              >
                {profileMutation.isPending ? "Saving..." : "Save Profile"}
              </button>
            </form>

            <div className="mt-12 border border-outline-variant/60 bg-surface-container-lowest p-8">
              <h2 className="font-headline-sm text-primary mb-6">My Location</h2>
              <div className="mb-6">
                <p className="font-body-md text-on-surface-variant">
                  Status:{" "}
                  <span className="font-semibold">{myLocation ? "Shared" : "Not shared"}</span>
                </p>
              </div>
              <button
                type="button"
                className={`${buttonClass}`}
                onClick={handleShareLocation}
                disabled={locationMutation.isPending}
              >
                {locationMutation.isPending
                  ? "Updating..."
                  : myLocation
                    ? "Update Location"
                    : "Share My Current Location"}
              </button>
            </div>

            <div className="mt-12 border border-outline-variant/60 bg-surface-container-lowest p-8">
              <h2 className="font-headline-sm text-primary mb-6">Change Password</h2>
              <form
                className="flex flex-col gap-6"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newPassword) {
                    toast.error("New password is required.");
                    return;
                  }
                  if (newPassword !== confirmNewPassword) {
                    toast.error("Passwords do not match.");
                    return;
                  }

                  setIsUpdatingPassword(true);
                  try {
                    const { error } = await supabase.auth.updateUser({ password: newPassword });
                    if (error) throw error;
                    toast.success("Password updated successfully.");
                    setNewPassword("");
                    setConfirmNewPassword("");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Failed to update password");
                  } finally {
                    setIsUpdatingPassword(false);
                  }
                }}
              >
                <div>
                  <label className={labelClass}>New Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`${fieldClass} mt-2`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Confirm New Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className={`${fieldClass} mt-2`}
                  />
                </div>
                <button
                  type="submit"
                  className={`${buttonClass} mt-2 max-w-fit`}
                  disabled={isUpdatingPassword}
                >
                  {isUpdatingPassword ? "Updating..." : "Update password"}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

type ConsultationLocationPayload = {
  consultationId: string;
  property_lat: number;
  property_lng: number;
  property_place_id: string;
  property_formatted_address: string;
};

function LocationEditor({
  consultationId,
  initialAddress,
}: {
  consultationId: string;
  initialAddress: string;
}) {
  const [address, setAddress] = useState(initialAddress);
  const [isEditing, setIsEditing] = useState(false);

  const autocompleteRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (payload: ConsultationLocationPayload) => {
      await updateConsultationLocation({ data: payload });
    },

    onSuccess: () => {
      toast.success("Location updated successfully!");
      qc.invalidateQueries({ queryKey: ["consultations"] });
      setIsEditing(false);
    },

    onError: (err: Error) => {
      toast.error(err.message || "Failed to update location");
    },
  });

  useEffect(() => {
    if (!isEditing || !autocompleteRef.current) {
      return;
    }
    const container = autocompleteRef.current;

    let autocompleteElement: HTMLElement | null = null;
    let cancelled = false;

    const initializeAutocomplete = async () => {
      try {
        if (!window.google?.maps) {
          toast.error("Google Maps is not loaded.");
          return;
        }

        const placesLibrary = await window.google.maps.importLibrary("places");

        if (cancelled || !autocompleteRef.current) {
          return;
        }

        const PlaceAutocompleteElement = placesLibrary.PlaceAutocompleteElement;

        if (!PlaceAutocompleteElement) {
          toast.error(
            "Google Places Autocomplete is not available. \nIf you are at the property location please update the property address using --SHARE MY CURRENT LOCATION-- in PROFILE SETTINGS.",
          );
          return;
        }

        // Create the new Places API autocomplete element
        autocompleteElement = new PlaceAutocompleteElement();

        // if (autocompleteElement) {
        autocompleteElement.setAttribute("placeholder", "Start typing an address...");

        autocompleteElement.className =
          "w-full border-0 border-b border-outline-variant/60 bg-transparent pt-2 pb-3 font-body-lg text-body-lg text-primary outline-none focus:border-primary";

        if (cancelled) {
          return;
        }

        container.appendChild(autocompleteElement);

        autocompleteElement.addEventListener("gmp-select", async (event: Event) => {
          try {
            if (cancelled) {
              return;
            }

            /*
             * CHANGED:
             * Strongly typed Google Places select event.
             */
            // temp blocking
            // const customEvent = event as GooglePlaceSelectEvent;

            // const placePrediction = customEvent.detail?.placePrediction;

            // if (!placePrediction) {
            //   toast.error("Google did not return a valid place.");
            //   return;
            // }
            // temp adding 2 lines
            console.log("Google gmp-select event:", event);
            console.log("Google gmp-select detail:", (event as CustomEvent).detail);

            const place = placePrediction.toPlace();

            await place.fetchFields({
              fields: ["formattedAddress", "location", "id"],
            });

            if (cancelled) {
              return;
            }

            if (!place.location) {
              toast.error("Google did not return coordinates for this location.");
              return;
            }

            if (!place.id) {
              toast.error("Google did not return a valid Place ID.");
              return;
            }

            const formatted = place.formattedAddress || "";

            setAddress(formatted);

            mutation.mutate({
              consultationId,
              property_lat: place.location.lat(),
              property_lng: place.location.lng(),
              property_place_id: place.id,
              property_formatted_address: formatted,
            });
          } catch (error) {
            console.error("Failed to process Google place:", error);

            toast.error("Unable to get details for this location.");
          }
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error("Failed to initialize Google Places:", error);

        toast.error("Google Places could not be initialized.");
      }
    };

    void initializeAutocomplete();

    return () => {
      cancelled = true;

      /*
       * CHANGED:
       * Use the captured `container` variable rather than
       * autocompleteRef.current during cleanup.
       */

      if (autocompleteElement && container.contains(autocompleteElement)) {
        container.removeChild(autocompleteElement);
      }

      autocompleteElement = null;
    };
  }, [isEditing, consultationId, mutation]);

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="text-xs text-secondary underline transition-colors hover:text-primary"
      >
        {initialAddress ? "Update Location" : "Set Property Location"}
      </button>
    );
  }

  return (
    <div className="mt-2">
      <div ref={autocompleteRef} className="w-full" />

      <div className="mt-2 flex items-center justify-between">
        <span className="text-[10px] text-on-surface-variant">Powered by Google Maps</span>

        <button
          type="button"
          onClick={() => setIsEditing(false)}
          className="text-[10px] text-secondary hover:text-primary"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

//           // Add it directly to our React container --
//           autocompleteRef.current.appendChild(autocompleteElement as Node);

//           autocompleteElement.addEventListener("gmp-select", async (event: Event) => {
//             try {
//               const customEvent = event as CustomEvent<{
//                 placePrediction?: {
//                   toPlace: () => {
//                     fetchFields: (options: { fields: string[] }) => Promise<void>;

//                     formattedAddress?: string;

//                     location?: {
//                       lat: () => number;
//                       lng: () => number;
//                     };

//                     id?: string;
//                   };
//                 };
//               }>;

//               const placePrediction = customEvent.detail?.placePrediction;

//               if (!placePrediction) {
//                 toast.error("Google did not return a valid place.");
//                 return;
//               }

//               const place = placePrediction.toPlace();

//               await place.fetchFields({
//                 fields: ["formattedAddress", "location", "id"],
//               });

//               if (!place.location) {
//                 toast.error("Google did not return coordinates for this location.");
//                 return;
//               }

//               if (!place.id) {
//                 toast.error("Google did not return a valid Place ID.");
//                 return;
//               }

//               const formatted = place.formattedAddress || "";

//               setAddress(formatted);

//               mutation.mutate({
//                 consultationId,
//                 property_lat: place.location.lat(),
//                 property_lng: place.location.lng(),
//                 property_place_id: place.id,
//                 property_formatted_address: formatted,
//               });
//             } catch (error) {
//               console.error("Failed to process Google place:", error);

//               toast.error("Unable to get details for this location.");
//             }
//           });
//         // }
//       } catch (error) {
//         console.error("Failed to initialize Google Places:", error);

//         toast.error("Google Places could not be initialized.");
//       }
//     };

//     void initializeAutocomplete();

//     return () => {
//       cancelled = true;

//       if (autocompleteElement && autocompleteRef.current?.contains(autocompleteElement)) {
//         autocompleteRef.current.removeChild(autocompleteElement);
//       }

//       autocompleteElement = null;
//     };
//   }, [isEditing, consultationId, mutation]);

//   if (!isEditing) {
//     return (
//       <button
//         type="button"
//         onClick={() => setIsEditing(true)}
//         className="text-xs text-secondary underline transition-colors hover:text-primary"
//       >
//         {initialAddress ? "Update Location" : "Set Property Location"}
//       </button>
//     );
//   }

//   return (
//     <div className="mt-2">
//       <div ref={autocompleteRef} className="w-full" />

//       <div className="mt-2 flex items-center justify-between">
//         <span className="text-[10px] text-on-surface-variant">Powered by Google Maps</span>

//         <button
//           type="button"
//           onClick={() => setIsEditing(false)}
//           className="text-[10px] text-secondary hover:text-primary"
//         >
//           Cancel
//         </button>
//       </div>
//     </div>
//   );
// }-
