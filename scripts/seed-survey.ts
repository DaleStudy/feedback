// 설문 하나와 편집자를 JSON 으로 정의해 D1 에 넣는다. 설문은 보통 사이트의 관리 화면에서 만들므로 로컬 개발 데이터용이다.
//   bun scripts/seed-survey.ts seed/blog01-final.json            # 로컬
//   bun scripts/seed-survey.ts seed/blog01-final.json --remote   # 프로덕션
// 같은 id 의 설문이 이미 있으면 실패한다. id 를 생략하면 새로 만든다.
// questions 항목은 둘 중 하나다:
//   { "common": "goal_achieved", "required"?: bool }                     ← src/questions/common.ts 의 공통 문항. 문구는 vars 로 채운다
//   { "type": "long", "label": "...", "required"?: bool, "config"?: {...} } ← 이 설문만의 문항
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import type { QuestionConfig, QuestionType, Visibility } from '../src/db/schema'
import type { CommonVars } from '../src/questions/common'
import { type QuestionInput, newSurveyId, normalizeSurveyFields, parseInvitee, resolveQuestions } from '../src/server/survey-input'

interface CommonRef {
  common: string
  required?: boolean
}
interface CustomQuestion {
  type: QuestionType
  label: string
  required?: boolean
  config?: QuestionConfig
}
interface SeedFile {
  editors: string[] // 설문을 고치고 결과를 볼 GitHub login
  survey: {
    id?: string
    title: string
    description?: string
    visibility?: Visibility // 기본 home
    invitees?: string[] // visibility 가 invited 일 때 대상. "@login" 또는 "team:slug"
    closesAt?: string
    vars?: CommonVars
    questions: Array<CommonRef | CustomQuestion>
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
const id = seed.survey.id ?? newSurveyId()
const survey = normalizeSurveyFields({
  title: seed.survey.title,
  description: seed.survey.description ?? null,
  visibility: seed.survey.visibility ?? 'home',
  closesAt: seed.survey.closesAt ?? null,
  vars: seed.survey.vars ?? null,
})
const items: QuestionInput[] = seed.survey.questions.map((item) => ('common' in item ? { key: item.common, required: item.required } : item))
const rows = resolveQuestions(items, survey.vars)

const sql = [
  `INSERT INTO surveys (id, title, description, visibility, closes_at, vars, created_at) VALUES (${q(id)}, ${q(survey.title)}, ${q(survey.description)}, ${q(survey.visibility)}, ${q(survey.closesAt)}, ${q(survey.vars ? JSON.stringify(survey.vars) : null)}, ${q(new Date().toISOString())});`,
  ...seed.editors.map((login) => `INSERT INTO survey_editors (survey_id, login) VALUES (${q(id)}, ${q(login)});`),
  ...(seed.survey.invitees ?? []).map(parseInvitee).map((i) => `INSERT INTO survey_invitees (survey_id, kind, name) VALUES (${q(id)}, ${q(i.kind)}, ${q(i.name)});`),
  ...rows.map(
    (row) =>
      `INSERT INTO questions (survey_id, position, key, type, label, required, identified, config) VALUES (${q(id)}, ${row.position}, ${q(row.key)}, ${q(row.type)}, ${q(row.label)}, ${row.required ? 1 : 0}, ${row.identified ? 1 : 0}, ${q(row.config ? JSON.stringify(row.config) : null)});`,
  ),
]

mkdirSync('.wrangler', { recursive: true })
const out = '.wrangler/seed.sql'
writeFileSync(out, sql.join('\n'))
console.log(`설문 ${id}`)

const target = flags.includes('--remote') ? '--remote' : '--local'
const result = spawnSync('bunx', ['wrangler', 'd1', 'execute', 'feedback', target, '--file', out], { stdio: 'inherit' })
process.exit(result.status ?? 1)
