// Addresses and labels shared by the "Pričamo priču" pages.
export const BOOK_PATH = '/pricamo-pricu/';
export const LIBRARY_PATH = '/pricamo-pricu/price/';
export const storyPath = (slug: string): string => `${BOOK_PATH}${slug}/`;
/** "02" for the second story. */
export const storyNumber = (n: number): string => String(n).padStart(2, '0');
/** Title of a story's own page, before the site name is added; the overlay shows the story under the same title. */
export const storyTitle = (story: { naslov: string; seo?: { naslov?: string } }): string => story.seo?.naslov ?? story.naslov;
