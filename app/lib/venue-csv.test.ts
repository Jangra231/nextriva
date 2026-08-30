import { describe, expect, it } from "vitest";
import { parseVenueCsv } from "./venue-csv";

describe("venue CSV import parser", () => {
  const header = "zone,ward,location,venueName,city,latitude,longitude,setting,capacity,isAccessible,accessibilityNotes,active";
  it("parses valid venue rows with capacity and accessibility details", () => {
    const result = parseVenueCsv(`${header}\nCentral,Ward 9,Sector 62,Community Centre,Noida,28.629000,77.364000,outdoor,1200,yes,Step-free entry,true`);
    expect(result.issues).toEqual([]);
    expect(result.rows[0]).toMatchObject({ venueName: "Community Centre", capacity: 1200, isAccessible: true, latitudeE6: 28629000 });
  });
  it("reports required-column, capacity, and duplicate-row failures before persistence", () => {
    expect(parseVenueCsv("venueName\nTest").issues[0].message).toContain("Missing required");
    const result = parseVenueCsv(`${header}\nCentral,Ward 9,Sector 62,Community Centre,Noida,28.6,77.3,outdoor,100,no,false\nCentral,Ward 9,Sector 62,Community Centre,Noida,28.6,77.3,outdoor,100,no,false\nCentral,Ward 10,Sector 63,Second Venue,Noida,28.6,77.3,outdoor,0,no,false`);
    expect(result.rows).toHaveLength(1);
    expect(result.issues).toHaveLength(2);
  });
});
