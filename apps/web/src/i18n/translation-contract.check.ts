import { getTranslation } from "./translations";
function checkTypes() {
  getTranslation("Common.save", "en");
  getTranslation("Feedback.items", "ru", { count: 2 });
  // @ts-expect-error Unknown catalogue key.
  getTranslation("Unknown.key", "en");
  // @ts-expect-error Count is required.
  getTranslation("Feedback.items", "en");
  // @ts-expect-error Plural counts must be numeric.
  getTranslation("Feedback.items", "en", { count: "two" });
  // @ts-expect-error Unexpected interpolation parameter.
  getTranslation("Feedback.items", "en", { total: 1 });
}
void checkTypes;
