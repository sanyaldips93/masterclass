let counter = 0;

export function nextId() {
  const id = counter.toString().padStart(16, "0").slice(-16);
  counter++;
  return id;
}
