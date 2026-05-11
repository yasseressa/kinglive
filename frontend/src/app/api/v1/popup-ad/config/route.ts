import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    imageUrl: process.env.POPUP_AD_IMAGE_URL || process.env.NEXT_PUBLIC_POPUP_AD_IMAGE_URL || "",
    linkUrl: process.env.POPUP_AD_LINK_URL || process.env.NEXT_PUBLIC_POPUP_AD_LINK_URL || "",
    alt: process.env.POPUP_AD_ALT || process.env.NEXT_PUBLIC_POPUP_AD_ALT || "Advertisement",
  });
}
