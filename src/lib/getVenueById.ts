import salles from "@/mocks/salles.json";

export function getVenueById(id: number) {
  return salles.find((venue) => venue.id === id);
}
