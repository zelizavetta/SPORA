import type { FridgeItem, Recipe, RecipeIngredient } from '@shared/types'

/** Нормализация названия продукта для сравнения: регистр, ё, лишние пробелы. */
export function normalizeName(name: string): string {
  return name.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim()
}

/**
 * Продукт считается имеющимся, если в холодильнике есть позиция с
 * ненулевым количеством, чьё название совпадает с ингредиентом или
 * содержит его (например «филе куриное» покрывает «курица» — нет,
 * но «молоко» покрывает «молоко 3.2%»).
 */
export function findInFridge(
  ingredient: RecipeIngredient,
  fridge: FridgeItem[],
): FridgeItem | undefined {
  const target = normalizeName(ingredient.name)
  if (!target) return undefined
  return fridge.find(item => {
    if (item.quantity <= 0) return false
    const have = normalizeName(item.name)
    return have === target || have.includes(target) || target.includes(have)
  })
}

export interface RecipeAvailability {
  /** Сколько ингредиентов есть в наличии. */
  available: number
  /** Всего ингредиентов в рецепте. */
  total: number
  /** Названия отсутствующих ингредиентов. */
  missing: string[]
  /** Доля наличия 0–1 (у рецепта без ингредиентов — 1). */
  ratio: number
}

export interface ShoppingItem {
  /** Название для показа (из первого встреченного рецепта). */
  name: string
  /** Все указанные количества: «200 г», «2 шт». */
  amounts: string[]
  /** Названия рецептов, где продукт нужен. */
  recipes: string[]
  /** Позиция в холодильнике, если продукт есть. */
  have?: FridgeItem
}

/**
 * Сводный список продуктов для набора рецептов: одинаковые ингредиенты
 * из разных рецептов схлопываются в одну строку.
 */
export function buildShoppingList(recipes: Recipe[], fridge: FridgeItem[]): ShoppingItem[] {
  const byName = new Map<string, ShoppingItem>()

  for (const recipe of recipes) {
    for (const ing of recipe.ingredients) {
      const key = normalizeName(ing.name)
      if (!key) continue
      let item = byName.get(key)
      if (!item) {
        item = { name: ing.name, amounts: [], recipes: [], have: findInFridge(ing, fridge) }
        byName.set(key, item)
      }
      if (ing.amount) item.amounts.push(ing.amount)
      if (!item.recipes.includes(recipe.title)) item.recipes.push(recipe.title)
    }
  }

  // сначала то, чего нет — это и есть список покупок
  return [...byName.values()].sort((a, b) => {
    if (!a.have !== !b.have) return a.have ? 1 : -1
    return a.name.localeCompare(b.name, 'ru')
  })
}

export function getAvailability(recipe: Recipe, fridge: FridgeItem[]): RecipeAvailability {
  const total = recipe.ingredients.length
  const missing = recipe.ingredients
    .filter(ing => !findInFridge(ing, fridge))
    .map(ing => ing.name)
  const available = total - missing.length
  return { available, total, missing, ratio: total === 0 ? 1 : available / total }
}
