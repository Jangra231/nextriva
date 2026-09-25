"use client";

import { X, Search } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { INDIAN_STATES, getCitiesForState } from "../lib/location-data";

export default function NavLocationFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
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
    
    const params = new URLSearchParams(searchParams.toString());
    if (state) {
      params.set("state", state);
      params.delete("city");
    } else {
      params.delete("state");
      params.delete("city");
    }
    router.push(`/events?${params.toString()}`);
  };

  const handleCitySelect = (city: string) => {
    setSelectedCity(city);
    setCityOpen(false);
    
    const params = new URLSearchParams(searchParams.toString());
    if (selectedState) params.set("state", selectedState);
    if (city) {
      params.set("city", city);
    } else {
      params.delete("city");
    }
    router.push(`/events?${params.toString()}`);
  };

  const clearState = () => {
    setSelectedState("");
    setSelectedCity("");
    
    const params = new URLSearchParams(searchParams.toString());
    params.delete("state");
    params.delete("city");
    router.push(`/events${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const clearCity = () => {
    setSelectedCity("");
    
    const params = new URLSearchParams(searchParams.toString());
    if (selectedState) params.set("state", selectedState);
    params.delete("city");
    router.push(`/events?${params.toString()}`);
  };

  return (
    <div className="nav-location-filter">
      <Search size={16} className="nav-location-search-icon" aria-hidden="true" />
      <div className="nav-location-pills">
        <div className="nav-location-dropdown" ref={stateRef}>
          <button
            type="button"
            className={`nav-location-pill ${selectedState ? "has-value" : ""} ${stateOpen ? "open" : ""}`}
            onClick={() => setStateOpen(!stateOpen)}
          >
            <span className="nav-pill-value">{selectedState || "State"}</span>
            {selectedState && (
              <X size={14} className="nav-pill-clear" onClick={(e) => { e.stopPropagation(); clearState(); }} />
            )}
          </button>
          {stateOpen && (
            <div className="nav-location-menu">
              <button type="button" className={`nav-menu-item ${!selectedState ? "active" : ""}`} onClick={() => handleStateSelect("")}>All states</button>
              {INDIAN_STATES.map(state => (
                <button key={state} type="button" className={`nav-menu-item ${selectedState === state ? "active" : ""}`} onClick={() => handleStateSelect(state)}>{state}</button>
              ))}
            </div>
          )}
        </div>
        {selectedState && cities.length > 0 && (
          <div className="nav-location-dropdown" ref={cityRef}>
            <button
              type="button"
              className={`nav-location-pill ${selectedCity ? "has-value" : ""} ${cityOpen ? "open" : ""}`}
              onClick={() => setCityOpen(!cityOpen)}
            >
              <span className="nav-pill-value">{selectedCity || "City"}</span>
              {selectedCity && (
                <X size={14} className="nav-pill-clear" onClick={(e) => { e.stopPropagation(); clearCity(); }} />
              )}
            </button>
            {cityOpen && (
              <div className="nav-location-menu">
                <button type="button" className={`nav-menu-item ${!selectedCity ? "active" : ""}`} onClick={() => handleCitySelect("")}>All cities</button>
                {cities.map(city => (
                  <button key={city} type="button" className={`nav-menu-item ${selectedCity === city ? "active" : ""}`} onClick={() => handleCitySelect(city)}>{city}</button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
