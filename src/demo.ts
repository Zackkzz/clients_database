import type { Client } from "./model";

const names = [
  "Coastal Solar Co.",
  "Brightside Energy",
  "Evergreen Electrical",
  "Summit Renewables",
  "Sunfield Power",
  "Northstar Solar",
  "Blue Horizon Energy",
  "Daybreak Installations",
  "Urban Current",
  "Solstice Electrical",
  "Greenline Energy",
  "Pacific Solar Works",
  "Clear Sky Systems",
  "Red Earth Renewables",
  "Harbour Electrical",
  "Elevate Energy",
  "Outback Solar",
  "Wattle Power",
  "Southern Spark",
  "Westwind Energy",
  "Eclipse Installations",
  "Aurora Electrical",
  "New Leaf Solar",
  "Skyline Renewables",
];
const contacts = [
  "Alex Morgan",
  "Jordan Lee",
  "Sam Taylor",
  "Casey Williams",
  "Jamie Chen",
  "Riley Parker",
];
const regions = ["QLD", "NSW", "VIC", "SA", "WA", "ACT", "NT", "TAS", "NZ"];

/** Fictional fixtures only; production records are never saved to the repository. */
export const demoClients: Client[] = names.map((name, index) => ({
  id: `demo-${index + 1}`,
  name,
  priority: index < 10 ? "Tier 1" : index < 18 ? "Tier 2" : "Tier 3",
  types: [
    index % 3 === 0
      ? "Hybrid installer"
      : index % 3 === 1
        ? "Residential installer"
        : "Distributor",
  ],
  contact: contacts[index % contacts.length],
  address: `${20 + index * 3} Example Street`,
  phone: `0400 000 ${String(index + 1).padStart(3, "0")}`,
  email: `contact${index + 1}@example.com`,
  state:
    regions[index % regions.length] === "NZ"
      ? ""
      : regions[index % regions.length],
  countryId: regions[index % regions.length] === "NZ" ? "demo-nz" : "demo-au",
  country:
    regions[index % regions.length] === "NZ" ? "New Zealand" : "Australia",
  countryCode: regions[index % regions.length] === "NZ" ? "NZ" : "AU",
  typeIds: [`demo-type-${index % 3}`],
  note: "",
}));
