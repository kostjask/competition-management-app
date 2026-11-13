// Synthetic required owner for resource/history fixtures in baseline-owned databases.
module.exports = async function performanceOwner(client, eventId, label) {
  const studio = await client.studio.create({ data: { eventId, name: label,
    registrations: { create: { eventId } } }, include: { registrations: true } });
  return { studioId: studio.id, registrationId: studio.registrations[0].id };
};
