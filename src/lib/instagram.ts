import axios from "axios"

export type TopPost = {
  username: string
  shortcode: string
  likeCount: number
  url: string
  thumbnail?: string
  caption?: string
}

export async function getMostLikedPost(username: string): Promise<TopPost | null> {
  try {
    // Méthode 1: Essayer l'endpoint JSON direct (peut fonctionner sans auth)
    const profileUrl = `https://www.instagram.com/api/v1/users/web_profile_info/?username=${username}`
    
    const res = await axios.get(profileUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "X-IG-App-ID": "936619743392459",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
      }
    })

    const data = res.data?.data?.user

    if (!data) {
      throw new Error("Pas de données utilisateur")
    }

    const edges = data?.edge_owner_to_timeline_media?.edges

    if (!Array.isArray(edges) || edges.length === 0) {
      return null
    }

    // Trouver le post avec le plus de likes
    let topPost = edges[0]
    for (const edge of edges) {
      const currentLikes = edge.node.edge_liked_by?.count || edge.node.edge_media_preview_like?.count || 0
      const topLikes = topPost.node.edge_liked_by?.count || topPost.node.edge_media_preview_like?.count || 0
      
      if (currentLikes > topLikes) {
        topPost = edge
      }
    }

    const node = topPost.node
    const likeCount = node.edge_liked_by?.count || node.edge_media_preview_like?.count || 0

    return {
      username,
      shortcode: node.shortcode,
      likeCount,
      url: `https://www.instagram.com/p/${node.shortcode}/`,
      thumbnail: node.thumbnail_src || node.display_url,
      caption: node.edge_media_to_caption?.edges?.[0]?.node?.text || ""
    }

  } catch (error) {
    console.error("Erreur avec la méthode API:", error)
    
    // Méthode 2: Fallback avec scraping HTML basique
    try {
      return await fallbackScraping(username)
    } catch (fallbackError) {
      console.error("Erreur avec le fallback:", fallbackError)
      return null
    }
  }
}

async function fallbackScraping(username: string): Promise<TopPost | null> {
  const profileUrl = `https://www.instagram.com/${username}/`
  
  const res = await axios.get(profileUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
    }
  })

  const html = res.data

  // Chercher les données JSON embarquées dans différents formats
  const patterns = [
    /"edge_owner_to_timeline_media":\s*({[^}]+})/,
    /window\._sharedData\s*=\s*({.+?});<\/script>/,
    /<script type="application\/ld\+json">({.+?})<\/script>/,
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match) {
      try {
        const jsonData = JSON.parse(match[1])
        // Traiter les données trouvées
        const edges = jsonData?.edges || 
                     jsonData?.entry_data?.ProfilePage?.[0]?.graphql?.user?.edge_owner_to_timeline_media?.edges

        if (Array.isArray(edges) && edges.length > 0) {
          let top = edges[0]
          for (const edge of edges) {
            const currentLikes = edge.node?.edge_liked_by?.count || 0
            const topLikes = top.node?.edge_liked_by?.count || 0
            if (currentLikes > topLikes) {
              top = edge
            }
          }

          return {
            username,
            shortcode: top.node.shortcode,
            likeCount: top.node.edge_liked_by?.count || 0,
            url: `https://www.instagram.com/p/${top.node.shortcode}/`,
            thumbnail: top.node.thumbnail_src,
            caption: top.node.edge_media_to_caption?.edges?.[0]?.node?.text
          }
        }
      } catch (parseError) {
        console.error("Erreur de parsing:", parseError)
        continue
      }
    }
  }

  throw new Error("Impossible d'extraire les données Instagram")
}