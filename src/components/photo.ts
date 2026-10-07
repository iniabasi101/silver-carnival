export function photoUrl(key: string, width: number) {
  return `/.netlify/images?url=${encodeURIComponent(`/api/photos/${key}`)}&w=${width}&h=${width}&fit=cover&fm=webp`
}
