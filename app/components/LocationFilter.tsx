"use client";

import { MapPin, X } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { INDIAN_STATES, getCitiesForState } from "../lib/location-data";

export default function LocationFilter({ initialState, initialCity }: { initialState?: string; initialCity?: string }) {
  const [selectedState, setSelectedState] = useState(initialState || "");
  const [selectedCity, setSelectedCity] = useState(initialCity || "");
  const [stateOpen, setStateOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const stateRef = useRef<HTMLDivElement>(null);
  const cityRef = useRef<HTMLDivElement>(null);

  const cities = selectedState ? getCitiesForState(selectedState) : [];

  const closeAll = useCallback(() => {
    setStateOpen(false);
    setCityOpen(false);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (stateRef.current && !stateRef.current.contains(e.target as Node)) {
        setStateOpen(false);
      }
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) {
        setCityOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAll();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [closeAll]);

  const handleStateSelect = (state: string) => {
    setSelectedState(state);
    setSelectedCity("");
    setStateOpen(false);
    setCityOpen(false);
  };

  const handleCitySelect = (city: string) => {
    setSelectedCity(city);
    setCityOpen(false);
  };

  const clearState = () => {
    setSelectedState("");
    setSelectedCity("");
  };

  const clearCity = () => {
    setSelectedCity("");
  };

  return (
    <div className="location-filter-modern">
      <div className="location-pills">
        {/* State Selector */}
        <div className="location-dropdown" ref={stateRef}>
          <button
            type="button"
            className={`location-pill ${selectedState ? "has-value" : ""} ${stateOpen ? "open" : ""}`}
            onClick={() => setStateOpen(!stateOpen)}
          >
            <span className="pill-value">{selectedState || "State"}</span>
            {selectedState && (
              <X
                size={14}
                className="pill-clear"
                onClick={(e) => {
                  e.stopPropagation();
                  clearState();
                }}
              />
            )}
          </button>
          {stateOpen && (
            <div className="location-menu">
              <button
                type="button"
                className={`menu-item ${!selectedState ? "active" : ""}`}
                onClick={() => handleStateSelect("")}
              >
                All states
              </button>
              {INDIAN_STATES.map(state => (
                <button
                  key={state}
                  type="button"
                  className={`menu-item ${selectedState === state ? "active" : ""}`}
                  onClick={() => handleStateSelect(state)}
                >
                  {state}
                </button>
              ))}
            </div>
          )}
          <input type="hidden" name="state" value={selectedState} />
        </div>

        {/* City Selector - shown only when state is selected */}
        {selectedState && cities.length > 0 && (
          <div className="location-dropdown" ref={cityRef}>
            <button
              type="button"
              className={`location-pill ${selectedCity ? "has-value" : ""} ${cityOpen ? "open" : ""}`}
              onClick={() => setCityOpen(!cityOpen)}
            >
              <span className="pill-value">{selectedCity || "City"}</span>
              {selectedCity && (
                <X
                  size={14}
                  className="pill-clear"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearCity();
                  }}
                />
              )}
            </button>
            {cityOpen && (
              <div className="location-menu">
                <button
                  type="button"
                  className={`menu-item ${!selectedCity ? "active" : ""}`}
                  onClick={() => handleCitySelect("")}
                >
                  All cities
                </button>
                {cities.map(city => (
                  <button
                    key={city}
                    type="button"
                    className={`menu-item ${selectedCity === city ? "active" : ""}`}
                    onClick={() => handleCitySelect(city)}
                  >
                    {city}
                  </button>
                ))}
              </div>
            )}
            <input type="hidden" name="city" value={selectedCity} />
          </div>
        )}

        {!selectedState && <input type="hidden" name="city" value="" />}
      </div>
    </div>
  );
}
