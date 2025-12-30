import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const LIKES_FILE = path.join(DATA_DIR, 'likes.json')

interface LikesData {
	[slug: string]: {
		count: number
		sessions: string[]
	}
}

function ensureDataDir() {
	if (!fs.existsSync(DATA_DIR)) {
		fs.mkdirSync(DATA_DIR, { recursive: true })
	}
}

function readLikes(): LikesData {
	ensureDataDir()
	if (!fs.existsSync(LIKES_FILE)) {
		return {}
	}
	try {
		return JSON.parse(fs.readFileSync(LIKES_FILE, 'utf-8'))
	} catch {
		return {}
	}
}

function writeLikes(data: LikesData) {
	ensureDataDir()
	fs.writeFileSync(LIKES_FILE, JSON.stringify(data, null, 2))
}

export async function GET(request: NextRequest) {
	const slug = request.nextUrl.searchParams.get('slug')
	const session = request.nextUrl.searchParams.get('session')

	if (!slug) {
		return NextResponse.json({ error: 'Missing slug' }, { status: 400 })
	}

	const likes = readLikes()
	const slugData = likes[slug] || { count: 0, sessions: [] }

	return NextResponse.json({
		count: slugData.count,
		likedBySession: session ? slugData.sessions.includes(session) : false
	})
}

export async function POST(request: NextRequest) {
	try {
		const { slug, session } = await request.json()
		if (!slug || !session) {
			return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
		}

		const likes = readLikes()
		if (!likes[slug]) {
			likes[slug] = { count: 0, sessions: [] }
		}

		if (!likes[slug].sessions.includes(session)) {
			likes[slug].sessions.push(session)
			likes[slug].count++
			writeLikes(likes)
		}

		return NextResponse.json({ success: true, count: likes[slug].count })
	} catch (error) {
		return NextResponse.json({ error: 'Failed to add like' }, { status: 500 })
	}
}

export async function DELETE(request: NextRequest) {
	try {
		const { slug, session } = await request.json()
		if (!slug || !session) {
			return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
		}

		const likes = readLikes()
		if (likes[slug] && likes[slug].sessions.includes(session)) {
			likes[slug].sessions = likes[slug].sessions.filter((s: string) => s !== session)
			likes[slug].count = Math.max(0, likes[slug].count - 1)
			writeLikes(likes)
		}

		return NextResponse.json({ success: true, count: likes[slug]?.count || 0 })
	} catch (error) {
		return NextResponse.json({ error: 'Failed to remove like' }, { status: 500 })
	}
}
