import type { EntryOptions, EntrySettings } from "@dance/schemas";

export const standardCategories = ["stage", "contemporary", "lyrical", "folk", "folkStylized", "show", "street", "classical", "ballroom"] as const;
export const presetNames = [...standardCategories, "kids", "big", "small", "duet", "solo", "kidsAge", "age7", "age11", "age14", "age18", "age26"] as const;
export type PresetNames = Record<typeof presetNames[number], string>;

/** Copies the source nomination table; never guesses semantic matches from a category name. */
export function danceExpressPreset(options: EntryOptions, settings: EntrySettings, names: PresetNames, id: () => string) {
  const result: EntryOptions = { categories: [...options.categories], ages: [...options.ages], formats: [...options.formats] };
  const categories = [...standardCategories, "kids" as const].map(key => {
    const row = result.categories.find(row => row.name === names[key]) ?? { id: id(), name: names[key] };
    if (!result.categories.includes(row)) result.categories.push(row);
    return row;
  });
  const ages = ([ ["kidsAge", 0, 7], ["age7", 7, 10], ["age11", 11, 13], ["age14", 14, 17], ["age18", 18, 25], ["age26", 26, null] ] as const).map(([key, minAge, maxAge]) => {
    const row = result.ages.find(row => row.name === names[key] && row.minAge === minAge && row.maxAge === maxAge) ?? { id: id(), name: names[key], minAge, maxAge };
    if (!result.ages.includes(row)) result.ages.push(row);
    return row;
  });
  const formats = ([ ["big", 7, null, 240], ["small", 3, 6, 240], ["duet", 2, 2, 150], ["solo", 1, 1, 150] ] as const).map(([key, minParticipants, maxParticipants, maxDurationSeconds]) => {
    const row = result.formats.find(row => row.name === names[key] && row.minParticipants === minParticipants && row.maxParticipants === maxParticipants && row.maxDurationSeconds === maxDurationSeconds) ?? { id: id(), name: names[key], minParticipants, maxParticipants, maxDurationSeconds };
    if (!result.formats.includes(row)) result.formats.push(row);
    return row;
  });
  const nominations: EntrySettings["nominations"] = categories.flatMap((category, index) =>
    (index === standardCategories.length ? ages.slice(0, 1) : ages.slice(1)).flatMap(age =>
      (index === standardCategories.length ? formats.slice(0, 2) : formats).map(format => ({ categoryId: category.id, ageGroupId: age.id, formatId: format.id,
        maxParticipants: format.maxParticipants, maxDurationSeconds: index === standardCategories.length ? 210 : format.maxDurationSeconds }))));
  return { options: result, settings: { ...settings, allowYounger: true, olderPercent: 20, requireTeacher: true, requireAuthor: true, nominations } };
}
