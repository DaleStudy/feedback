// 설문 정의 JSON 을 SQL 로 바꿔 D1 에 넣는다.
//   bun scripts/seed-survey.ts seed/blog01-final.json            # 로컬
//   bun scripts/seed-survey.ts seed/blog01-final.json --remote   # 프로덕션
// 스터디·기수·리더는 있으면 건너뛰고, 설문은 같은 id 가 이미 있으면 실패한다.
// questions 항목은 둘 중 하나다:
//   { "common": "goal_achieved", "config"?: {...}, "required"?: bool }  ← src/questions/common.ts 의 공통 문항
//   { "type": "long", "label": "...", "required"?: bool, "config"?: {...} } ← 이 설문만의 문항
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import type { QuestionConfig, QuestionType } from '../src/db/schema'
import { type CommonVars, commonQuestions, renderLabel } from '../src/questions/common'

interface CommonRef {
  common: string
  required?: boolean
  config?: QuestionConfig
}
interface CustomQuestion {
  type: QuestionType
  label: string
  required?: boolean
  config?: QuestionConfig
}
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
const now = new Date().toISOString()

const resolved = seed.survey.questions.map((item) => {
  if (!('common' in item)) return { key: null, ...item }
  const base = commonQuestions.find((c) => c.key === item.common)
  if (!base) throw new Error(`공통 문항이 없습니다: ${item.common}`)
  if (!seed.survey.vars) throw new Error('공통 문항을 쓰려면 survey.vars 가 필요합니다')
  return {
    key: base.key,
    type: base.type,
    label: renderLabel(base.label, seed.survey.vars),
    required: item.required ?? base.required,
    config: base.config || item.config ? { ...base.config, ...item.config } : undefined,
  }
})

const sql = [
  `INSERT OR IGNORE INTO studies (id, name) VALUES (${q(seed.study.id)}, ${q(seed.study.name)});`,
  `INSERT OR IGNORE INTO cohorts (id, study_id, name) VALUES (${q(seed.cohort.id)}, ${q(seed.study.id)}, ${q(seed.cohort.name)});`,
  ...seed.leaders.map((login) => `INSERT OR IGNORE INTO leaders (study_id, login) VALUES (${q(seed.study.id)}, ${q(login)});`),
  `INSERT INTO surveys (id, cohort_id, title, description, anonymous, closes_at, created_at) VALUES (${q(seed.survey.id)}, ${q(seed.cohort.id)}, ${q(seed.survey.title)}, ${q(seed.survey.description)}, ${seed.survey.anonymous === false ? 0 : 1}, ${q(seed.survey.closesAt)}, ${q(now)});`,
  ...resolved.map(
    (question, i) =>
      `INSERT INTO questions (survey_id, position, key, type, label, required, config) VALUES (${q(seed.survey.id)}, ${i + 1}, ${q(question.key)}, ${q(question.type)}, ${q(question.label)}, ${question.required === false ? 0 : 1}, ${q(question.config ? JSON.stringify(question.config) : null)});`,
  ),
].join('\n')

mkdirSync('.wrangler', { recursive: true })
const out = '.wrangler/seed.sql'
writeFileSync(out, sql)

const target = flags.includes('--remote') ? '--remote' : '--local'
const result = spawnSync('bunx', ['wrangler', 'd1', 'execute', 'feedback', target, '--file', out], { stdio: 'inherit' })
process.exit(result.status ?? 1)
