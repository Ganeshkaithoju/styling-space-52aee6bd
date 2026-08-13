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

// ============================================================================
// LOCATION EDITOR
// ============================================================================

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

  // ==========================================================================
  // CHANGE 1:
  // Keep the mutation exactly as before, but destructure `mutate`.
  //
  // WHY:
  // The complete `mutation` object can change between renders.
  // The `mutate` function is the value we actually need inside useEffect.
  // This allows the effect dependency list to stay stable and removes:
  //
  // React Hook useEffect has a missing dependency: 'mutation'
  // ==========================================================================
  const mutation = useMutation({
    mutationFn: async (payload: ConsultationLocationPayload) => {
      await updateConsultationLocation({
        data: payload,
      });
    },

    onSuccess: () => {
      toast.success("Location updated successfully!");

      qc.invalidateQueries({
        queryKey: ["consultations"],
      });

      setIsEditing(false);
    },

    onError: (err: Error) => {
      toast.error(err.message || "Failed to update location");
    },
  });

  // ==========================================================================
  // CHANGE 2:
  // Extract only the stable mutate function instead of using `mutation.mutate`
  // directly inside the useEffect.
  //
  // This is important because the effect should not depend on the complete
  // React Query mutation object.
  // ==========================================================================
  const saveLocation = mutation.mutate;

  useEffect(() => {
    // ==========================================================================
    // ORIGINAL:
    // if (!isEditing || !autocompleteRef.current) {
    //   return;
    // }
    //
    // CHANGE:
    // Same logic, retained exactly.
    // ==========================================================================

    if (!isEditing || !autocompleteRef.current) {
      return;
    }

    // ==========================================================================
    // CHANGE 3:
    // Capture the container once.
    //
    // This prevents cleanup from depending on a later value of
    // autocompleteRef.current.
    // ==========================================================================

    const container = autocompleteRef.current;

    let autocompleteElement: HTMLElement | null = null;

    // ==========================================================================
    // CHANGE 4:
    // Keep a cancellation flag so asynchronous Google initialization cannot
    // modify the DOM after React has already cleaned up the effect.
    // ==========================================================================

    let cancelled = false;

    // ==========================================================================
    // CHANGE 5:
    // The initialization function now explicitly returns a cleanup function
    // for the Google event listener.
    // ==========================================================================

    const initializeAutocomplete = async (): Promise<(() => void) | undefined> => {
      try {
        // ======================================================================
        // CHANGE 6:
        // Keep the existing Google Maps availability check.
        // ======================================================================

        if (!window.google?.maps) {
          toast.error("Google Maps is not loaded.");
          return;
        }

        // ======================================================================
        // CHANGE 7:
        // Continue using Google's modern Places library.
        // ======================================================================

        const placesLibrary = await window.google.maps.importLibrary("places");

        // ======================================================================
        // CHANGE 8:
        // Check cancellation after the asynchronous import completes.
        // ======================================================================

        if (cancelled || !autocompleteRef.current) {
          return;
        }

        const PlaceAutocompleteElement = placesLibrary.PlaceAutocompleteElement;

        // ======================================================================
        // CHANGE 9:
        // Keep the existing safety check.
        // ======================================================================

        if (!PlaceAutocompleteElement) {
          toast.error(
            "Google Places Autocomplete is not available. " +
              "Please try again or use Share My Current Location.",
          );

          return;
        }

        // ======================================================================
        // CHANGE 10:
        // Create the modern Google PlaceAutocompleteElement.
        // ======================================================================

        autocompleteElement = new PlaceAutocompleteElement();

        // ======================================================================
        // CHANGE 11:
        // Set placeholder using the Google element attribute.
        // ======================================================================

        autocompleteElement.setAttribute("placeholder", "Start typing an address...");

        // ======================================================================
        // CHANGE 12:
        // Existing application styling is preserved.
        // ======================================================================

        autocompleteElement.className =
          "w-full border-0 border-b border-outline-variant/60 bg-transparent pt-2 pb-3 font-body-lg text-body-lg text-primary outline-none focus:border-primary";

        // ======================================================================
        // CHANGE 13:
        // Prevent appending the element if React has already unmounted it.
        // ======================================================================

        if (cancelled) {
          return;
        }

        container.appendChild(autocompleteElement);

        // ======================================================================
        // CHANGE 14 — MOST IMPORTANT GOOGLE FIX:
        //
        // DO NOT read:
        //
        // const customEvent = event as CustomEvent;
        // const detail = customEvent.detail;
        // const placePrediction = detail?.placePrediction;
        //
        // The current Google Places API provides `placePrediction` directly
        // on the gmp-select event.
        //
        // Google documents the event as:
        //
        // gmp-select -> PlacePredictionSelectEvent
        //
        // with:
        //
        // event.placePrediction
        //
        // This fixes the:
        //
        // "Google did not return a valid place."
        //
        // error caused by reading the wrong event structure.
        // ======================================================================

        const handlePlaceSelect = async (event: Event) => {
          try {
            if (cancelled) {
              return;
            }

            // ==================================================================
            // CHANGE 15:
            //
            // Read placePrediction directly from the Google event.
            //
            // We intentionally do not use event.detail anymore.
            // ==================================================================

            const googleEvent = event as Event & {
              placePrediction?: GooglePlacePrediction;
            };

            const placePrediction = googleEvent.placePrediction;

            // ==================================================================
            // CHANGE 16:
            // Validate that Google actually supplied a PlacePrediction object.
            // ==================================================================

            if (!placePrediction || typeof placePrediction.toPlace !== "function") {
              console.error(
                "Google gmp-select event did not contain a valid placePrediction:",
                event,
              );

              toast.error(
                "Google did not return a valid place. Please select an address from the suggestions.",
              );

              return;
            }

            // ==================================================================
            // CHANGE 17:
            // Convert the prediction into Google's Place object.
            // ==================================================================

            const place = placePrediction.toPlace();

            if (!place) {
              toast.error("Google could not resolve the selected place.");
              return;
            }

            // ==================================================================
            // CHANGE 18:
            // Request ONLY the fields required by this application.
            //
            // formattedAddress -> address shown to the user
            // location          -> latitude + longitude
            // id                -> Google Place ID
            // ==================================================================

            await place.fetchFields({
              fields: ["formattedAddress", "location", "id"],
            });

            // ==================================================================
            // CHANGE 19:
            // Do not continue if the component was unmounted while Google was
            // fetching place details.
            // ==================================================================

            if (cancelled) {
              return;
            }

            // ==================================================================
            // CHANGE 20:
            // Validate latitude/longitude.
            // ==================================================================

            if (!place.location) {
              toast.error("Google did not return coordinates for this location.");

              return;
            }

            // ==================================================================
            // CHANGE 21:
            // Validate Place ID.
            // ==================================================================

            if (!place.id) {
              toast.error("Google did not return a valid Place ID.");

              return;
            }

            // ==================================================================
            // CHANGE 22:
            // Validate the formatted address before saving.
            // ==================================================================

            const formatted = place.formattedAddress?.trim() ?? "";

            if (!formatted) {
              toast.error("Google did not return a formatted address.");

              return;
            }

            // ==================================================================
            // CHANGE 23:
            // Extract coordinates once.
            //
            // This avoids calling lat()/lng() multiple times and gives us
            // exactly the values that will be saved.
            // ==================================================================

            const latitude = place.location.lat();
            const longitude = place.location.lng();

            // ==================================================================
            // CHANGE 24:
            // Validate that Google returned real numeric coordinates.
            // ==================================================================

            if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
              toast.error("Google returned invalid coordinates for this location.");

              return;
            }

            // ==================================================================
            // CHANGE 25:
            // Update the local address immediately.
            //
            // The database update happens below.
            // ==================================================================

            setAddress(formatted);

            // ==================================================================
            // CHANGE 26:
            // Save the EXACT Google-selected location to the consultation.
            //
            // This is the actual database mutation.
            //
            // consultationId
            // property_lat
            // property_lng
            // property_place_id
            // property_formatted_address
            // ==================================================================

            saveLocation({
              consultationId,
              property_lat: latitude,
              property_lng: longitude,
              property_place_id: place.id,
              property_formatted_address: formatted,
            });
          } catch (error) {
            // ==================================================================
            // CHANGE 27:
            // Provide a useful error instead of always showing the same generic
            // message.
            // ==================================================================

            console.error("Failed to process Google place selection:", error);

            toast.error(
              error instanceof Error ? error.message : "Unable to get details for this location.",
            );
          }
        };

        // ======================================================================
        // CHANGE 28:
        // Register the Google gmp-select listener.
        //
        // Google officially uses this event for PlaceAutocompleteElement.
        // ======================================================================

        autocompleteElement.addEventListener("gmp-select", handlePlaceSelect);

        // ======================================================================
        // CHANGE 29:
        // Return a cleanup function that removes the exact listener that was
        // registered above.
        // ======================================================================

        return () => {
          autocompleteElement?.removeEventListener("gmp-select", handlePlaceSelect);
        };
      } catch (error) {
        if (cancelled) {
          return;
        }

        // ======================================================================
        // CHANGE 30:
        // Keep detailed console logging while showing a safe UI message.
        // ======================================================================

        console.error("Failed to initialize Google Places:", error);

        toast.error("Google Places could not be initialized.");

        return;
      }
    };

    // ==========================================================================
    // CHANGE 31:
    // Store the listener cleanup returned by the async initialization.
    // ==========================================================================

    let removeListener: (() => void) | undefined;

    void initializeAutocomplete().then((cleanup) => {
      if (cancelled) {
        cleanup?.();
        return;
      }

      removeListener = cleanup;
    });

    // ==========================================================================
    // CHANGE 32:
    // Complete React cleanup.
    // ==========================================================================

    return () => {
      cancelled = true;

      // ========================================================================
      // CHANGE 33:
      // Remove the Google event listener before removing the element.
      // ========================================================================

      removeListener?.();

      // ========================================================================
      // CHANGE 34:
      // Remove only the Google autocomplete element created by this effect.
      // ========================================================================

      if (autocompleteElement && container.contains(autocompleteElement)) {
        container.removeChild(autocompleteElement);
      }

      autocompleteElement = null;
    };

    // ==========================================================================
    // CHANGE 35 — REACT HOOK WARNING FIX:
    //
    // ORIGINAL:
    //
    // }, [isEditing, consultationId]);
    //
    // The original code used `mutation` inside the effect but did not include
    // it in the dependency list.
    //
    // Instead of adding the entire mutation object, we use the extracted
    // `saveLocation` mutation function.
    //
    // This keeps the effect focused on the values it actually uses.
    // ==========================================================================
  }, [isEditing, consultationId, saveLocation]);

  // ============================================================================
  // CHANGE 36:
  // Keep the existing non-editing UI.
  // ============================================================================

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

  // ============================================================================
  // CHANGE 37:
  // Keep the existing editing UI.
  // ============================================================================

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
