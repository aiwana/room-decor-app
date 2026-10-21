/**
 * backend/src/ai/promptBuilder.ts
 * Bien lua chon cua nguoi dung (roomType, style, colorTheme, prompt) thanh
 * prompt tieng Anh co cau truc cho AI tao anh. Nguoi dung khong can biet viet prompt.
 *
 * Nguyen tac: mo ta phong Mẫu cung loai + dung phong cach/mau da chon.
 * (Giai doan 1 dung Pollinations text-to-image: AI khong nhin anh goc.)
 */

export interface InteriorPromptInput {
  roomType: string;
  style: string;
  colorTheme?: string | null | undefined;
  prompt?: string | null | undefined;
}

/* Ban dich sang tieng Anh — giu 1 noi duy nhat de sua doi */
const ROOM_TYPES: Record<string, string> = {
  living: "living room",
  bedroom: "bedroom",
  kitchen: "kitchen",
  office: "home office workspace",
  bathroom: "bathroom",
};

const STYLES: Record<string, string> = {
  modern: "modern contemporary",
  minimalist: "minimalist",
  japandi: "japandi (japanese-scandinavian fusion)",
  scandinavian: "scandinavian",
  luxury: "luxury elegant",
  industrial: "industrial",
};

const COLOR_THEMES: Record<string, string> = {
  white: "white and light neutral",
  beige: "warm beige",
  gray: "cool gray",
  brown: "earthy brown and wood tones",
  green: "sage green accents",
  black: "black accent",
};

const STYLE_DETAILS: Record<string, string> = {
  modern: "clean lines, high-quality contemporary furniture, subtle decor",
  minimalist: "few well-chosen furniture pieces, uncluttered surfaces, lots of empty space",
  japandi: "light oak wood, low-profile furniture, natural linen textures, wabi-sabi simplicity",
  scandinavian: "light woods, cozy textiles, functional furniture, bright airy feeling",
  luxury: "marble surfaces, brass details, plush velvet furniture, refined lighting",
  industrial: "exposed brick, black metal frames, raw concrete, vintage leather",
};

export const buildInteriorPrompt = (input: InteriorPromptInput): string => {
  const room = ROOM_TYPES[input.roomType] ?? "room";
  const style = STYLES[input.style] ?? "modern";
  const styleDetail = STYLE_DETAILS[input.style] ?? "harmonious furniture arrangement";
  const color = input.colorTheme ? (COLOR_THEMES[input.colorTheme] ?? "neutral") : "harmonious neutral";

  const parts = [
    `Photorealistic interior photography of a ${room} designed in ${style} style.`,
    `${styleDetail.charAt(0).toUpperCase() + styleDetail.slice(1)}.`,
    `${color.charAt(0).toUpperCase() + color.slice(1)} color palette.`,
    input.prompt?.trim() ? `Additional requirements from the user: ${input.prompt.trim()}.` : "",
    "Eye-level camera angle, natural and warm ambient lighting, cohesive furniture arrangement,",
    "high resolution, magazine quality, no people, no text, no watermark.",
  ];

  return parts.filter(Boolean).join(" ");
};
