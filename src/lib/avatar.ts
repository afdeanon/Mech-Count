export const getDefaultAvatar = (name?: string, email?: string): string => {
  const fallbackLabel = name?.trim() || email?.trim() || 'User';
  const encodedName = encodeURIComponent(fallbackLabel);
  return `https://ui-avatars.com/api/?name=${encodedName}&background=0ea5e9&color=ffffff&bold=true`;
};

