// 설문 정의 JSON 을 SQL 로 바꿔 D1 에 넣는다.
//   bun scripts/seed-survey.ts seed/example.json            # 로컬
//   bun scripts/seed-survey.ts seed/example.json --remote   # 프로덕션
// 스터디·기수·리더는 있으면 건너뛰고, 설문은 같은 id 가 이미 있으면 실패한다.
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import type { QuestionType } from '../src/db/schema'

interface SeedFile {
  study: { id: string; name: string }
  cohort: { id: string; name: string }
  leaders: string[]
  survey: {
    id: string
    title: string
    description?: string
    anonymous?: boolean
    closesAt?: string
    questions: Array<{ type: QuestionType; label: string; required?: boolean; options?: string[] }>
  }
}

const args = process.argv.slice(2)
const flags = args.filter((a) => a.startsWith('--'))
const file = args.find((a) => !a.startsWith('--'))
if (!file) {
  console.error('usage: bun scripts/seed-survey.ts <seed.json> [--remote]')
  process.exit(1)
}

const seed = JSON.parse(readFileSync(file, 'utf8')) as SeedFile
const q = (v: string | null | undefined) => (v == null ? 'NULL' : `'${v.replace(/'/g, "''")}'`)
const now = new Date().toISOString()

const sql = [
  `INSERT OR IGNORE INTO studies (id, name) VALUES (${q(seed.study.id)}, ${q(seed.study.name)});`,
  `INSERT OR IGNORE INTO cohorts (id, study_id, name) VALUES (${q(seed.cohort.id)}, ${q(seed.study.id)}, ${q(seed.cohort.name)});`,
  ...seed.leaders.map((login) => `INSERT OR IGNORE INTO leaders (study_id, login) VALUES (${q(seed.study.id)}, ${q(login)});`),
  `INSERT INTO surveys (id, cohort_id, title, description, anonymous, closes_at, created_at) VALUES (${q(seed.survey.id)}, ${q(seed.cohort.id)}, ${q(seed.survey.title)}, ${q(seed.survey.description)}, ${seed.survey.anonymous === false ? 0 : 1}, ${q(seed.survey.closesAt)}, ${q(now)});`,
  ...seed.survey.questions.map(
    (question, i) =>
      `INSERT INTO questions (survey_id, position, type, label, required, options) VALUES (${q(seed.survey.id)}, ${i + 1}, ${q(question.type)}, ${q(question.label)}, ${question.required === false ? 0 : 1}, ${q(question.options ? JSON.stringify(question.options) : null)});`,
  ),
].join('\n')

mkdirSync('.wrangler', { recursive: true })
const out = '.wrangler/seed.sql'
writeFileSync(out, sql)

const target = flags.includes('--remote') ? '--remote' : '--local'
const result = spawnSync('bunx', ['wrangler', 'd1', 'execute', 'feedback', target, '--file', out], { stdio: 'inherit' })
process.exit(result.status ?? 1)
