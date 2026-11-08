import { create } from 'zustand'
import { db, now } from '@shared/db'
import { api } from '@shared/api/server'
import type { Recipe, RecipeIngredient, RecipeType } from '@shared/types'

interface RecipeStore {
  recipes: Recipe[]
  isLoading: boolean
  load: () => Promise<void>
  add: (title: string, description: string, type: RecipeType, ingredients: RecipeIngredient[]) => Promise<void>
  update: (id: number, patch: Partial<Pick<Recipe, 'title' | 'description' | 'type' | 'ingredients'>>) => Promise<void>
  remove: (id: number) => Promise<void>
}

export const useRecipeStore = create<RecipeStore>((set, get) => ({
  recipes: [],
  isLoading: false,

  load: async () => {
    set({ isLoading: true })
    const recipes = await db.recipes.orderBy('createdAt').reverse().toArray()
    set({ recipes, isLoading: false })
  },

  add: async (title, description, type, ingredients) => {
    const ts = now()
    const uuid = crypto.randomUUID()
    const id = await db.recipes.add({ uuid, title, description, type, ingredients, createdAt: ts, updatedAt: ts })
    const recipe = await db.recipes.get(id)
    if (recipe) {
      set(s => ({ recipes: [recipe, ...s.recipes] }))
      api.upsert('recipes', recipe).catch(() => {})
    }
  },

  update: async (id, patch) => {
    const ts = now()
    await db.recipes.update(id, { ...patch, updatedAt: ts })
    set(s => ({ recipes: s.recipes.map(r => r.id === id ? { ...r, ...patch, updatedAt: ts } : r) }))
    const recipe = get().recipes.find(r => r.id === id)
    if (recipe?.uuid) api.update('recipes', recipe.uuid, { ...patch, updatedAt: ts }).catch(() => {})
  },

  remove: async (id) => {
    const recipe = get().recipes.find(r => r.id === id)
    await db.recipes.delete(id)
    set(s => ({ recipes: s.recipes.filter(r => r.id !== id) }))
    if (recipe?.uuid) api.remove('recipes', recipe.uuid).catch(() => {})
  },
}))
