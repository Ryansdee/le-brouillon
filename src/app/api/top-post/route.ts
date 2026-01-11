import { NextResponse } from "next/server"
import { getMostLikedPost } from "@/lib/instagram"

export async function GET() {
  try {
    const post = await getMostLikedPost("lebrouillon.mag")

    if (!post) {
      return NextResponse.json({ error: "Aucun post trouvé" }, { status: 404 })
    }

    return NextResponse.json(post)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Erreur scraping Instagram" }, { status: 500 })
  }
}
