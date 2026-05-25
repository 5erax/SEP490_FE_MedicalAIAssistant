export function normalizeUserRecord(user) {
  if (!user || typeof user !== "object") return user;
  const id = user.id ?? user.userId ?? user.identityId ?? "";

  return {
    ...user,
    id,
    userId: user.userId ?? id,
    identityId: user.identityId ?? id,
    name: user.name ?? user.displayName ?? "",
  };
}

export function normalizePagedUsers(response) {
  const data = response?.data;
  if (!data?.items) return response;

  return {
    ...response,
    data: {
      ...data,
      items: data.items.map(normalizeUserRecord),
    },
  };
}
