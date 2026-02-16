import { useTranslation } from "@i18n/useTranslation";

export function Home() {
  const { t } = useTranslation();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">{t("Common.welcome")}</h1>
      <p className="mt-2 text-slate-600">Welcome to the competition app.</p>
    </div>
  );
}

console.log(isPalindrome(12121)); // true

function isPalindrome(x: number): boolean {
    if (x < 0) return false; // Negative numbers are not palindromes
    const str = x.toString();
    const reversedStr = str.split("").reverse().join("");

    return str === reversedStr;
};