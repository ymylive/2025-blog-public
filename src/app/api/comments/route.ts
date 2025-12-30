import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const COMMENTS_FILE = path.join(DATA_DIR, 'comments.json')

function ensureDataDir() {
	if (!fs.existsSync(DATA_DIR)) {
		fs.mkdirSync(DATA_DIR, { recursive: true })
	}
}

function readComments(): Record<string, any[]> {
	ensureDataDir()
	if (!fs.existsSync(COMMENTS_FILE)) {
		return {}
	}
	try {
		return JSON.parse(fs.readFileSync(COMMENTS_FILE, 'utf-8'))
	} catch {
		return {}
	}
}

function writeComments(data: Record<string, any[]>) {
	ensureDataDir()
	fs.writeFileSync(COMMENTS_FILE, JSON.stringify(data, null, 2))
}

export async function GET(request: NextRequest) {
	const slug = request.nextUrl.searchParams.get('slug')
	if (!slug) {
		return NextResponse.json({ error: 'Missing slug' }, { status: 400 })
	}

	const comments = readComments()
	return NextResponse.json({ comments: comments[slug] || [] })
}

export async function POST(request: NextRequest) {
	try {
		const comment = await request.json()
		if (!comment.blogSlug || !comment.author || !comment.content) {
			return NextResponse.json({ error: 'Invalid comment' }, { status: 400 })
		}

		const comments = readComments()
		if (!comments[comment.blogSlug]) {
			comments[comment.blogSlug] = []
		}
		comments[comment.blogSlug].push(comment)
		writeComments(comments)

		return NextResponse.json({ success: true })
	} catch (error) {
		return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 })
	}
}

export async function DELETE(request: NextRequest) {
	const slug = request.nextUrl.searchParams.get('slug')
	const id = request.nextUrl.searchParams.get('id')

	if (!slug || !id) {
		return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
	}

	const comments = readComments()
	if (comments[slug]) {
		comments[slug] = comments[slug].filter((c: any) => c.id !== id)
		writeComments(comments)
	}

	return NextResponse.json({ success: true })
}
