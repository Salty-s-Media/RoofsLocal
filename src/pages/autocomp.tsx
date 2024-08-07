"use client";

import React, { useEffect } from "react";

export default function Auto() {
  useEffect(() => {
    async function initMap() {
      // Request needed libraries.
      //@ts-ignore
      await google.maps.importLibrary("places");

      // Create the input HTML element, and append it.
      //@ts-ignore
      const placeAutocomplete = new google.maps.places.PlaceAutocompleteElement(
        {}
      );

      //@ts-ignore
      document.body.appendChild(placeAutocomplete);

      // Inject HTML UI.
      const selectedPlaceTitle = document.createElement("p");

      selectedPlaceTitle.textContent = "";
      document.body.appendChild(selectedPlaceTitle);

      const selectedPlaceInfo = document.createElement("pre");

      selectedPlaceInfo.textContent = "";
      document.body.appendChild(selectedPlaceInfo);
      // Add the gmp-placeselect listener, and display the results.
      //@ts-ignore
      placeAutocomplete.addEventListener(
        "gmp-placeselect",
        async ({ place }) => {
          await place.fetchFields({
            fields: ["displayName", "formattedAddress", "location"],
          });
          selectedPlaceTitle.textContent = "Selected Place:";
          selectedPlaceInfo.textContent = JSON.stringify(
            place.toJSON(),
            /* replacer */ null,
            /* space */ 2
          );
        }
      );
    }

    initMap();
  }, []);

  return (
    <div className="min-h-screen w-full justify-center flex flex-col my-6">
      <h1>Google Places Autocomplete</h1>
    </div>
  );
}
