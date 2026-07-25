import { prisma } from "@asaplocal/db";

export function listUserAddresses(userId: string) {
  return prisma.address.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
}

interface AddressInput {
  addressLine: string;
  city: string;
  postcode?: string;
  lat: number;
  lng: number;
  country?: string;
}

/** Reuses an existing saved address (same addressLine + city, case-insensitive) instead of duplicating it. */
export async function upsertUserAddress(userId: string, addr: AddressInput) {
  const existing = await prisma.address.findFirst({
    where: {
      userId,
      addressLine: { equals: addr.addressLine, mode: "insensitive" },
      city: { equals: addr.city, mode: "insensitive" },
    },
  });
  if (existing) return existing;
  return prisma.address.create({
    data: {
      userId,
      addressLine: addr.addressLine,
      city: addr.city,
      postcode: addr.postcode,
      lat: addr.lat,
      lng: addr.lng,
      country: addr.country ?? "GB",
    },
  });
}

export function deleteUserAddress(userId: string, addressId: string) {
  return prisma.address.deleteMany({ where: { id: addressId, userId } });
}

export function updateUserAddress(userId: string, addressId: string, addr: Partial<AddressInput>) {
  return prisma.address.updateMany({ where: { id: addressId, userId }, data: addr });
}
