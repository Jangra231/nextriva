"use client";

import { Search, X, ChevronDown } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState, useRef, useEffect, useCallback } from "react";
import { INDIAN_STATES, getCitiesForState } from "../lib/location-data";

export default function NavSearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(searchParams.get("search") || "");
  const [selectedState, setSelectedState] = useState(searchParams.get("state") || "");
  const [selectedCity, setSelectedCity] = useState(searchParams.get("city") || "");
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

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchValue) params.set("search", searchValue);
    if (selectedState) params.set("state", selectedState);
    if (selectedCity) params.set("city", selectedCity);
    router.push(`/events?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSubmit} className="nav-search-bar">
      <div className="nav-search-input-wrapper">
        <Search size={14} aria-hidden="true" className="nav-search-icon" />
        <input
          type="text"
          name="search"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Search events, interests..."
          className="nav-search-input"
          aria-label="Search events, interests, or activities"
        />
      </div>

      {/* State Pill */}
      <div className="nav-location-dropdown" ref={stateRef}>
        <button
          type="button"
          className={`nav-location-pill ${selectedState ? "has-value" : ""} ${stateOpen ? "open" : ""}`}
          onClick={() => setStateOpen(!stateOpen)}
        >
          <span className="nav-pill-value">{selectedState || "State"}</span>
          {selectedState ? (
            <X
              size={12}
              className="nav-pill-clear"
              onClick={(e) => {
                e.stopPropagation();
                clearState();
              }}
            />
          ) : (
            <ChevronDown size={12} className={`nav-pill-chev ${stateOpen ? "rotated" : ""}`} aria-hidden="true" />
          )}
        </button>
        {stateOpen && (
          <div className="nav-location-menu">
            <button
              type="button"
              className={`nav-menu-item ${!selectedState ? "active" : ""}`}
              onClick={() => handleStateSelect("")}
            >
              All states
            </button>
            {INDIAN_STATES.map(state => (
              <button
                key={state}
                type="button"
                className={`nav-menu-item ${selectedState === state ? "active" : ""}`}
                onClick={() => handleStateSelect(state)}
              >
                {state}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* City Pill — always visible, disabled until a state is selected */}
      <div className="nav-location-dropdown" ref={cityRef}>
        <button
          type="button"
          className={`nav-location-pill ${selectedCity ? "has-value" : ""} ${cityOpen ? "open" : ""} ${!selectedState || cities.length === 0 ? "disabled" : ""}`}
          onClick={() => {
            if (selectedState && cities.length > 0) setCityOpen(!cityOpen);
          }}
          aria-disabled={!selectedState || cities.length === 0}
        >
          <span className="nav-pill-value">{selectedCity || "City"}</span>
          {selectedCity ? (
            <X
              size={12}
              className="nav-pill-clear"
              onClick={(e) => {
                e.stopPropagation();
                clearCity();
              }}
            />
          ) : (
            <ChevronDown size={12} className={`nav-pill-chev ${cityOpen ? "rotated" : ""}`} aria-hidden="true" />
          )}
        </button>
        {cityOpen && (
          <div className="nav-location-menu">
            <button
              type="button"
              className={`nav-menu-item ${!selectedCity ? "active" : ""}`}
              onClick={() => handleCitySelect("")}
            >
              All cities
            </button>
            {cities.map(city => (
              <button
                key={city}
                type="button"
                className={`nav-menu-item ${selectedCity === city ? "active" : ""}`}
                onClick={() => handleCitySelect(city)}
              >
                {city}
              </button>
            ))}
          </div>
        )}
      </div>

      <button type="submit" className="btn btn-coral nav-find-btn">
        Search
      </button>
    </form>
  );
}
