import { GoogleGenerativeAI } from '@google/generative-ai'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined

let client: GoogleGenerativeAI | null = null

function getClient(): GoogleGenerativeAI {
  if (!API_KEY) throw new Error('VITE_GEMINI_API_KEY не задан в .env')
  if (!client) client = new GoogleGenerativeAI(API_KEY)
  return client
}

export async function askGemini(prompt: string): Promise<string> {
  const model = getClient().getGenerativeModel({ model: 'gemini-1.5-flash' })
  const result = await model.generateContent(prompt)
  return result.response.text()
}

export async function getMoodInsight(entries: { score: number; emotions: string[]; note: string; date: string }[]): Promise<string> {
  const summary = entries
    .slice(-7)
    .map(e => `${e.date}: настроение ${e.score}/5, эмоции: ${e.emotions.join(', ')}, заметка: "${e.note}"`)
    .join('\n')

  const prompt = `Ты мягкий и поддерживающий помощник-рефлексия (не терапевт).
Вот записи настроения пользователя за последние дни:
${summary}

Дай короткий (2-3 предложения) тёплый инсайт: что ты замечаешь, что может помочь.
Отвечай по-русски, в мягком тоне без советов принимать или не принимать лекарства.`

  return askGemini(prompt)
}

export async function getDailyReflection(context: {
  mood?: number
  tasks: string[]
  workouts: string[]
}): Promise<string> {
  const prompt = `Ты добрый помощник для ежедневной рефлексии.
Сегодня у пользователя:
- Настроение: ${context.mood ? `${context.mood}/5` : 'не отмечено'}
- Задачи выполнены: ${context.tasks.length ? context.tasks.join(', ') : 'нет'}
- Тренировки: ${context.workouts.length ? context.workouts.join(', ') : 'нет'}

Напиши тёплое короткое (1-2 предложения) завершение дня. По-русски.`

  return askGemini(prompt)
}
