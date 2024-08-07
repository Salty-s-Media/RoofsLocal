"use client";

import React, { useEffect } from "react";

declare global {
  interface Window {
    init: () => void;
  }
}

interface Request {
  input: string;
  locationRestriction: {
    west: number;
    north: number;
    east: number;
    south: number;
  };
  origin: { lat: number; lng: number };
  includedPrimaryTypes: string[];
  language: string;
  region: string;
  sessionToken?: google.maps.places.AutocompleteSessionToken;
}

export default function Auto() {
  useEffect(() => {
    /**
     * @license
     * Copyright 2024 Google LLC. All Rights Reserved.
     * SPDX-License-Identifier: Apache-2.0
     */
    let title: HTMLElement | null;
    let results: HTMLElement | null;
    let input: HTMLInputElement | null;
    let token: google.maps.places.AutocompleteSessionToken;
    let request: Request = {
      input: "",
      locationRestriction: {
        west: -122.44,
        north: 37.8,
        east: -122.39,
        south: 37.78,
      },
      origin: { lat: 37.7893, lng: -122.4039 },
      includedPrimaryTypes: ["restaurant"],
      language: "en-US",
      region: "us",
    };

    async function init() {
      token = new google.maps.places.AutocompleteSessionToken();
      title = document.getElementById("title");
      results = document.getElementById("results");
      input = document.querySelector("input");

      if (input) {
        input.addEventListener("input", makeAcRequest);
      }

      request = await refreshToken(request);
    }

    async function makeAcRequest(event: Event) {
      const target = event.target as HTMLInputElement;

      // Reset elements and exit if an empty string is received.
      if (target.value === "") {
        if (title) title.innerText = "";
        if (results) results.replaceChildren();
        return;
      }

      // Add the latest char sequence to the request.
      request.input = target.value;

      // Fetch autocomplete suggestions and show them in a list.
      // @ts-ignore
      const { suggestions } =
        await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions(
          request
        );

      if (title) title.innerText = `Query predictions for "${request.input}"`;
      // Clear the list first.
      if (results) results.replaceChildren();

      for (const suggestion of suggestions) {
        const placePrediction = suggestion.placePrediction;
        // Create a link for the place, add an event handler to fetch the place.
        const a = document.createElement("a");
        a.addEventListener("click", () => {
          onPlaceSelected(placePrediction!.toPlace());
        });
        a.innerText = placePrediction!.text.toString();

        // Create a new list element.
        const li = document.createElement("li");
        li.appendChild(a);
        if (results) results.appendChild(li);
      }
    }

    // Event handler for clicking on a suggested place.
    async function onPlaceSelected(place: google.maps.places.Place) {
      await place.fetchFields({
        fields: ["displayName", "formattedAddress"],
      });

      const placeText = document.createTextNode(
        `${place.displayName}: ${place.formattedAddress}`
      );

      if (results) {
        results.replaceChildren(placeText);
        if (title) title.innerText = "Selected Place:";
      }
      if (input) input.value = "";
      request = await refreshToken(request);
    }

    // Helper function to refresh the session token.
    async function refreshToken(request: Request) {
      // Create a new session token and add it to the request.
      token = new google.maps.places.AutocompleteSessionToken();
      request.sessionToken = token;
      return request;
    }

    window.init = init;

    // Cleanup event listener on component unmount
    return () => {
      if (input) {
        input.removeEventListener("input", makeAcRequest);
      }
    };
  }, []);

  return (
    <div className="min-h-screen w-full justify-center flex flex-col my-6">
      <h1 id="title">Google Places Autocomplete</h1>
      <ul id="results"></ul>
      <input type="text" placeholder="Enter a place" />
    </div>
  );
}
