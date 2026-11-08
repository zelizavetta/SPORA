import { useMemo, useState } from 'react'
import { useRecipeStore, getAvailability, findInFridge, buildShoppingList } from '@entities/recipe'
import { useFridgeStore } from '@entities/fridge'
import {
  useMealPlanStore, weekStart, weekDays, addDays, toYMD, formatWeekRange, DAY_NAMES,
} from '@entities/meal-plan'
import { Button, Card, Input, Modal, Textarea } from '@shared/ui'
import type {
  FridgeItem, ProductCategory, Recipe, RecipeIngredient, RecipeType,
} from '@shared/types'
import styles from './RecipesPage.module.css'

// ── Справочники ───────────────────────────────────────────────────────────────
const RECIPE_TYPES: { value: RecipeType; label: string; emoji: string }[] = [
  { value: 'breakfast', label: 'Завтрак', emoji: '🍳' },
  { value: 'soup',  label: 'Суп',      emoji: '🍲' },
  { value: 'hot',   label: 'Горячее',  emoji: '🍖' },
  { value: 'salad', label: 'Салат',    emoji: '🥗' },
  { value: 'sweet', label: 'Сладкое',  emoji: '🍰' },
  { value: 'drink', label: 'Напиток',  emoji: '🥤' },
  { value: 'snack', label: 'Закуска',  emoji: '🥪' },
  { value: 'other', label: 'Другое',   emoji: '🍽' },
]

const PRODUCT_CATEGORIES: { value: ProductCategory; label: string; emoji: string }[] = [
  { value: 'meat',      label: 'Мясо и рыба',     emoji: '🥩' },
  { value: 'dairy',     label: 'Молочные',        emoji: '🥛' },
  { value: 'vegetable', label: 'Овощи',           emoji: '🥦' },
  { value: 'fruit',     label: 'Фрукты и ягоды',  emoji: '🍎' },
  { value: 'grain',     label: 'Крупы и мука',    emoji: '🌾' },
  { value: 'spice',     label: 'Специи и соусы',  emoji: '🧂' },
  { value: 'drink',     label: 'Напитки',         emoji: '🧃' },
  { value: 'sweet',     label: 'Сладкое',         emoji: '🍬' },
  { value: 'other',     label: 'Другое',          emoji: '📦' },
]

type SortMode = 'available' | 'created' | 'title'
const SORT_LABELS: Record<SortMode, string> = {
  available: 'По наличию продуктов',
  created:   'По дате добавления',
  title:     'По названию',
}

function typeMeta(t: RecipeType) {
  return RECIPE_TYPES.find(r => r.value === t) ?? RECIPE_TYPES[RECIPE_TYPES.length - 1]
}
function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Редактор списка ингредиентов (используется в модалке рецепта) ─────────────
function IngredientEditor({
  ingredients, onChange,
}: {
  ingredients: RecipeIngredient[]
  onChange: (next: RecipeIngredient[]) => void
}) {
  const [name, setName]     = useState('')
  const [amount, setAmount] = useState('')

  const addIngredient = () => {
    if (!name.trim()) return
    onChange([...ingredients, { id: crypto.randomUUID(), name: name.trim(), amount: amount.trim() }])
    setName(''); setAmount('')
  }

  return (
    <div>
      <p className={styles.formLabel}>Продукты</p>

      {ingredients.length > 0 && (
        <ul className={styles.ingEditList}>
          {ingredients.map(ing => (
            <li key={ing.id} className={styles.ingEditRow}>
              <span className={styles.ingEditName}>{ing.name}</span>
              {ing.amount && <span className={styles.ingEditAmount}>{ing.amount}</span>}
              <button
                className={styles.ingEditRemove}
                onClick={() => onChange(ingredients.filter(i => i.id !== ing.id))}
                aria-label="Убрать продукт"
              >×</button>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.ingEditInputs}>
        <Input
          placeholder="Продукт"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addIngredient() } }}
        />
        <Input
          placeholder="Кол-во"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addIngredient() } }}
        />
        <Button size="sm" variant="ghost" onClick={addIngredient} disabled={!name.trim()}>+</Button>
      </div>
    </div>
  )
}

// ── Вкладка «Рецепты» ─────────────────────────────────────────────────────────
function RecipesTab({ fridge }: { fridge: FridgeItem[] }) {
  const { recipes, add, update, remove } = useRecipeStore()

  const [open, setOpen]           = useState(false)
  const [editing, setEditing]     = useState<Recipe | null>(null)
  const [expanded, setExpanded]   = useState<number | null>(null)
  const [typeFilter, setTypeFilter] = useState<RecipeType | 'all'>('all')
  const [sort, setSort]           = useState<SortMode>('available')
  const [saving, setSaving]       = useState(false)

  // поля формы
  const [fTitle, setFTitle] = useState('')
  const [fDesc, setFDesc]   = useState('')
  const [fType, setFType]   = useState<RecipeType>('hot')
  const [fIngs, setFIngs]   = useState<RecipeIngredient[]>([])

  const resetForm = () => { setFTitle(''); setFDesc(''); setFType('hot'); setFIngs([]); setEditing(null) }

  const openCreate = () => { resetForm(); setOpen(true) }

  const openEdit = (r: Recipe) => {
    setEditing(r)
    setFTitle(r.title); setFDesc(r.description); setFType(r.type); setFIngs(r.ingredients)
    setOpen(true)
  }

  const handleSave = async () => {
    if (!fTitle.trim()) return
    setSaving(true)
    if (editing?.id) {
      await update(editing.id, {
        title: fTitle.trim(), description: fDesc.trim(), type: fType, ingredients: fIngs,
      })
    } else {
      await add(fTitle.trim(), fDesc.trim(), fType, fIngs)
    }
    setSaving(false); setOpen(false); resetForm()
  }

  const visible = useMemo(() => {
    const filtered = typeFilter === 'all' ? recipes : recipes.filter(r => r.type === typeFilter)
    const withAvail = filtered.map(r => ({ recipe: r, avail: getAvailability(r, fridge) }))
    return withAvail.sort((a, b) => {
      if (sort === 'title')   return a.recipe.title.localeCompare(b.recipe.title, 'ru')
      if (sort === 'created') return b.recipe.createdAt - a.recipe.createdAt
      // по наличию: больше готовых ингредиентов — выше; при равенстве меньше нехватки
      if (b.avail.available !== a.avail.available) return b.avail.available - a.avail.available
      if (b.avail.ratio !== a.avail.ratio) return b.avail.ratio - a.avail.ratio
      return b.recipe.createdAt - a.recipe.createdAt
    })
  }, [recipes, fridge, typeFilter, sort])

  return (
    <div className="stack stack-md">
      <div className={styles.toolbar}>
        <div className={styles.chipRow}>
          <button
            className={[styles.chip, typeFilter === 'all' ? styles.chipActive : ''].join(' ')}
            onClick={() => setTypeFilter('all')}
          >Все</button>
          {RECIPE_TYPES.map(t => (
            <button
              key={t.value}
              className={[styles.chip, typeFilter === t.value ? styles.chipActive : ''].join(' ')}
              onClick={() => setTypeFilter(t.value)}
            >{t.emoji} {t.label}</button>
          ))}
        </div>

        <div className={styles.sortRow}>
          <select
            className={styles.select}
            value={sort}
            onChange={e => setSort(e.target.value as SortMode)}
          >
            {(Object.keys(SORT_LABELS) as SortMode[]).map(m => (
              <option key={m} value={m}>{SORT_LABELS[m]}</option>
            ))}
          </select>
          <Button size="sm" onClick={openCreate}>+ Рецепт</Button>
        </div>
      </div>

      {visible.length === 0 && (
        <p className={styles.empty}>
          {recipes.length === 0 ? 'Пока нет рецептов. Добавь первый! 🍲' : 'Ничего не найдено по этому фильтру'}
        </p>
      )}

      {visible.map(({ recipe, avail }) => {
        const meta   = typeMeta(recipe.type)
        const isOpen = expanded === recipe.id

        return (
          <Card key={recipe.id} className={styles.recipeCard}>
            <div className={styles.recipeHeader} onClick={() => setExpanded(isOpen ? null : recipe.id!)}>
              <span className={styles.typeEmoji}>{meta.emoji}</span>
              <div className={styles.recipeHeadText}>
                <p className={styles.recipeTitle}>{recipe.title}</p>
                <p className={styles.recipeMeta}>{meta.label} · {formatDate(recipe.createdAt)}</p>
              </div>
              <span className={styles.chevron}>{isOpen ? '▲' : '▼'}</span>
            </div>

            {recipe.ingredients.length > 0 && (
              <>
                <div className={styles.availRow}>
                  <div className={styles.availBar}>
                    <div
                      className={styles.availFill}
                      style={{ width: `${Math.round(avail.ratio * 100)}%` }}
                    />
                  </div>
                  <span className={styles.availLabel}>{avail.available}/{avail.total}</span>
                </div>

                <div className={styles.ingList}>
                  {recipe.ingredients.map(ing => {
                    const have = findInFridge(ing, fridge)
                    return (
                      <span
                        key={ing.id}
                        className={[styles.ingChip, have ? '' : styles.ingChipMissing].join(' ')}
                        title={have ? `В холодильнике: ${have.quantity} ${have.unit}` : 'Нет в холодильнике'}
                      >
                        {!have && <span className={styles.warnMark}>!</span>}
                        {ing.name}
                        {ing.amount && <span className={styles.ingAmount}>{ing.amount}</span>}
                      </span>
                    )
                  })}
                </div>
              </>
            )}

            {isOpen && (
              <div className={styles.expanded}>
                {recipe.description && <p className={styles.recipeDesc}>{recipe.description}</p>}
                {avail.missing.length > 0 && (
                  <p className={styles.missingLine}>
                    <span className={styles.warnMark}>!</span> Не хватает: {avail.missing.join(', ')}
                  </p>
                )}
                <div className="row row-gap-sm">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(recipe)}>Изменить</Button>
                  <Button size="sm" variant="danger" onClick={() => remove(recipe.id!)}>Удалить</Button>
                </div>
              </div>
            )}
          </Card>
        )
      })}

      <Modal
        isOpen={open}
        onClose={() => { setOpen(false); resetForm() }}
        title={editing ? 'Изменить рецепт' : 'Новый рецепт'}
      >
        <div className="stack stack-md">
          <Input label="Название" value={fTitle} onChange={e => setFTitle(e.target.value)} placeholder="Что готовим?" />
          <Textarea label="Описание (необязательно)" value={fDesc} onChange={e => setFDesc(e.target.value)} rows={3} />

          <div>
            <p className={styles.formLabel}>Тип</p>
            <div className={styles.typeGrid}>
              {RECIPE_TYPES.map(t => (
                <button
                  key={t.value}
                  className={[styles.typeBtn, fType === t.value ? styles.typeBtnActive : ''].join(' ')}
                  onClick={() => setFType(t.value)}
                >
                  <span>{t.emoji}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <IngredientEditor ingredients={fIngs} onChange={setFIngs} />

          <Button onClick={handleSave} disabled={saving || !fTitle.trim()}>
            {saving ? 'Сохраняю...' : editing ? 'Сохранить' : 'Добавить рецепт'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

// ── Вкладка «Холодильник» ─────────────────────────────────────────────────────
function FridgeTab({ items }: { items: FridgeItem[] }) {
  const { add, update, changeQuantity, remove } = useFridgeStore()

  const [open, setOpen]       = useState(false)
  const [editing, setEditing] = useState<FridgeItem | null>(null)
  const [saving, setSaving]   = useState(false)

  const [fName, setFName] = useState('')
  const [fCat, setFCat]   = useState<ProductCategory>('other')
  const [fQty, setFQty]   = useState('1')
  const [fUnit, setFUnit] = useState('шт')

  const resetForm = () => { setFName(''); setFCat('other'); setFQty('1'); setFUnit('шт'); setEditing(null) }
  const openCreate = () => { resetForm(); setOpen(true) }

  const openEdit = (item: FridgeItem) => {
    setEditing(item)
    setFName(item.name); setFCat(item.category); setFQty(String(item.quantity)); setFUnit(item.unit)
    setOpen(true)
  }

  const handleSave = async () => {
    if (!fName.trim()) return
    const qty = Math.max(0, Number(fQty) || 0)
    setSaving(true)
    if (editing?.id) {
      await update(editing.id, { name: fName.trim(), category: fCat, quantity: qty, unit: fUnit.trim() || 'шт' })
    } else {
      await add(fName.trim(), fCat, qty, fUnit.trim() || 'шт')
    }
    setSaving(false); setOpen(false); resetForm()
  }

  // группировка по категориям в порядке справочника
  const groups = useMemo(() => (
    PRODUCT_CATEGORIES
      .map(cat => ({ cat, items: items.filter(i => i.category === cat.value) }))
      .filter(g => g.items.length > 0)
  ), [items])

  return (
    <div className="stack stack-md">
      <div className={styles.fridgeToolbar}>
        <p className={styles.fridgeCount}>
          {items.length === 0 ? 'Холодильник пуст' : `Продуктов: ${items.length}`}
        </p>
        <Button size="sm" onClick={openCreate}>+ Продукт</Button>
      </div>

      {groups.length === 0 && (
        <p className={styles.empty}>Добавь продукты, чтобы видеть, что можно приготовить 🧊</p>
      )}

      {groups.map(({ cat, items: groupItems }) => (
        <Card key={cat.value} className={styles.groupCard}>
          <p className={styles.groupTitle}>
            <span className={styles.groupEmoji}>{cat.emoji}</span>
            {cat.label}
            <span className={styles.groupCount}>{groupItems.length}</span>
          </p>

          <ul className={styles.productList}>
            {groupItems.map(item => (
              <li key={item.id} className={[styles.productRow, item.quantity === 0 ? styles.productOut : ''].join(' ')}>
                <button className={styles.productName} onClick={() => openEdit(item)} title="Изменить">
                  {item.name}
                </button>

                <div className={styles.qtyControls}>
                  <button
                    className={styles.qtyBtn}
                    onClick={() => changeQuantity(item.id!, -1)}
                    disabled={item.quantity <= 0}
                    aria-label="Уменьшить"
                  >−</button>
                  <span className={styles.qtyValue}>{item.quantity} {item.unit}</span>
                  <button
                    className={styles.qtyBtn}
                    onClick={() => changeQuantity(item.id!, 1)}
                    aria-label="Увеличить"
                  >+</button>
                </div>

                <button
                  className={styles.deleteBtn}
                  onClick={() => remove(item.id!)}
                  aria-label="Удалить продукт"
                >×</button>
              </li>
            ))}
          </ul>
        </Card>
      ))}

      <Modal
        isOpen={open}
        onClose={() => { setOpen(false); resetForm() }}
        title={editing ? 'Изменить продукт' : 'Новый продукт'}
      >
        <div className="stack stack-md">
          <Input label="Название" value={fName} onChange={e => setFName(e.target.value)} placeholder="Например, молоко" />

          <div className={styles.qtyFields}>
            <Input label="Количество" type="number" min={0} value={fQty} onChange={e => setFQty(e.target.value)} />
            <Input label="Единица" value={fUnit} onChange={e => setFUnit(e.target.value)} placeholder="шт / г / мл" />
          </div>

          <div>
            <p className={styles.formLabel}>Тип продукта</p>
            <div className={styles.typeGrid}>
              {PRODUCT_CATEGORIES.map(c => (
                <button
                  key={c.value}
                  className={[styles.typeBtn, fCat === c.value ? styles.typeBtnActive : ''].join(' ')}
                  onClick={() => setFCat(c.value)}
                >
                  <span>{c.emoji}</span>
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving || !fName.trim()}>
            {saving ? 'Сохраняю...' : editing ? 'Сохранить' : 'Добавить продукт'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

// ── Вкладка «Неделя» ──────────────────────────────────────────────────────────
function WeekTab({ fridge }: { fridge: FridgeItem[] }) {
  const { recipes } = useRecipeStore()
  const { entries, add, remove, clearRange } = useMealPlanStore()

  const [monday, setMonday]         = useState(() => weekStart(new Date()))
  const [pickerDate, setPickerDate] = useState<string | null>(null)
  const [search, setSearch]         = useState('')
  const [showAll, setShowAll]       = useState(false)

  const days      = useMemo(() => weekDays(monday), [monday])
  const fromDate  = toYMD(days[0])
  const toDate    = toYMD(days[6])
  const todayYMD  = toYMD(new Date())

  const recipeByUuid = useMemo(
    () => new Map(recipes.map(r => [r.uuid, r])),
    [recipes],
  )

  /** Записи плана этой недели, сгруппированные по дате. */
  const planByDate = useMemo(() => {
    const map = new Map<string, { entryId: number; recipe: Recipe }[]>()
    for (const entry of entries) {
      if (entry.date < fromDate || entry.date > toDate) continue
      const recipe = recipeByUuid.get(entry.recipeUuid)
      if (!recipe) continue // рецепт удалён — запись просто не показываем
      const list = map.get(entry.date) ?? []
      list.push({ entryId: entry.id!, recipe })
      map.set(entry.date, list)
    }
    return map
  }, [entries, fromDate, toDate, recipeByUuid])

  const plannedRecipes = useMemo(
    () => [...planByDate.values()].flat().map(p => p.recipe),
    [planByDate],
  )

  const shopping = useMemo(
    () => buildShoppingList(plannedRecipes, fridge),
    [plannedRecipes, fridge],
  )
  const toBuy = shopping.filter(s => !s.have)

  const pickerCandidates = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = q
      ? recipes.filter(r =>
          r.title.toLowerCase().includes(q) ||
          r.ingredients.some(i => i.name.toLowerCase().includes(q)))
      : recipes
    return filtered
      .map(r => ({ recipe: r, avail: getAvailability(r, fridge) }))
      .sort((a, b) => b.avail.available - a.avail.available)
  }, [recipes, fridge, search])

  const handlePick = async (recipeUuid: string) => {
    if (!pickerDate) return
    await add(pickerDate, recipeUuid)
    setPickerDate(null); setSearch('')
  }

  return (
    <div className="stack stack-md">
      {/* Навигация по неделям */}
      <div className={styles.weekNav}>
        <button className={styles.weekArrow} onClick={() => setMonday(addDays(monday, -7))} aria-label="Предыдущая неделя">‹</button>
        <div className={styles.weekRangeWrap}>
          <p className={styles.weekRange}>{formatWeekRange(monday)}</p>
          <button className={styles.weekToday} onClick={() => setMonday(weekStart(new Date()))}>сегодня</button>
        </div>
        <button className={styles.weekArrow} onClick={() => setMonday(addDays(monday, 7))} aria-label="Следующая неделя">›</button>
      </div>

      {/* Дни недели */}
      {days.map((day, i) => {
        const ymd     = toYMD(day)
        const planned = planByDate.get(ymd) ?? []
        const isToday = ymd === todayYMD

        return (
          <Card key={ymd} className={[styles.dayCard, isToday ? styles.dayCardToday : ''].join(' ')}>
            <div className={styles.dayHeader}>
              <span className={styles.dayName}>{DAY_NAMES[i]}</span>
              <span className={styles.dayDate}>{day.getDate()}.{String(day.getMonth() + 1).padStart(2, '0')}</span>
              <button className={styles.dayAdd} onClick={() => { setPickerDate(ymd); setSearch('') }}>+</button>
            </div>

            {planned.length === 0 ? (
              <p className={styles.dayEmpty}>ничего не запланировано</p>
            ) : (
              <ul className={styles.dayList}>
                {planned.map(({ entryId, recipe }) => {
                  const avail = getAvailability(recipe, fridge)
                  const meta  = typeMeta(recipe.type)
                  return (
                    <li key={entryId} className={styles.dayItem}>
                      <span className={styles.dayItemEmoji}>{meta.emoji}</span>
                      <span className={styles.dayItemTitle}>{recipe.title}</span>
                      {avail.missing.length > 0 && (
                        <span className={styles.dayItemMissing} title={`Не хватает: ${avail.missing.join(', ')}`}>
                          <span className={styles.warnMark}>!</span>{avail.missing.length}
                        </span>
                      )}
                      <button className={styles.deleteBtn} onClick={() => remove(entryId)} aria-label="Убрать из плана">×</button>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        )
      })}

      {/* Список нужных продуктов */}
      <Card className={styles.shoppingCard}>
        <div className={styles.shoppingHeader}>
          <p className={styles.shoppingTitle}>🛒 Нужные продукты</p>
          {shopping.length > 0 && (
            <button className={styles.shoppingToggle} onClick={() => setShowAll(v => !v)}>
              {showAll ? 'только нехватка' : 'показать все'}
            </button>
          )}
        </div>

        {plannedRecipes.length === 0 ? (
          <p className={styles.dayEmpty}>Добавь рецепты в план — соберём список продуктов</p>
        ) : (showAll ? shopping : toBuy).length === 0 ? (
          <p className={styles.shoppingDone}>Всё есть в холодильнике ✓</p>
        ) : (
          <ul className={styles.shoppingList}>
            {(showAll ? shopping : toBuy).map(item => (
              <li key={item.name} className={[styles.shoppingRow, item.have ? styles.shoppingHave : ''].join(' ')}>
                {item.have
                  ? <span className={styles.okMark}>✓</span>
                  : <span className={styles.warnMark}>!</span>}
                <div className={styles.shoppingText}>
                  <span className={styles.shoppingName}>{item.name}</span>
                  {item.amounts.length > 0 && (
                    <span className={styles.shoppingAmount}>{item.amounts.join(' + ')}</span>
                  )}
                </div>
                <span className={styles.shoppingFor} title={item.recipes.join(', ')}>
                  {item.recipes.length > 1 ? `${item.recipes.length} рецепта` : item.recipes[0]}
                </span>
              </li>
            ))}
          </ul>
        )}

        {plannedRecipes.length > 0 && (
          <div className={styles.shoppingFooter}>
            <span className={styles.shoppingSummary}>
              Рецептов: {plannedRecipes.length} · купить: {toBuy.length}
            </span>
            <Button size="sm" variant="ghost" onClick={() => clearRange(fromDate, toDate)}>
              Очистить неделю
            </Button>
          </div>
        )}
      </Card>

      {/* Выбор рецепта на день */}
      <Modal
        isOpen={pickerDate !== null}
        onClose={() => { setPickerDate(null); setSearch('') }}
        title="Добавить рецепт"
      >
        <div className="stack stack-md">
          <Input placeholder="Поиск по названию или продукту..." value={search} onChange={e => setSearch(e.target.value)} />

          {pickerCandidates.length === 0 ? (
            <p className={styles.empty}>
              {recipes.length === 0 ? 'Сначала добавь рецепты 🍲' : 'Ничего не найдено'}
            </p>
          ) : (
            <ul className={styles.pickerList}>
              {pickerCandidates.map(({ recipe, avail }) => (
                <li key={recipe.uuid}>
                  <button className={styles.pickerItem} onClick={() => handlePick(recipe.uuid)}>
                    <span className={styles.dayItemEmoji}>{typeMeta(recipe.type).emoji}</span>
                    <span className={styles.pickerTitle}>{recipe.title}</span>
                    <span className={styles.pickerAvail}>
                      {avail.total > 0 ? `${avail.available}/${avail.total}` : '—'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Modal>
    </div>
  )
}

// ── Страница ──────────────────────────────────────────────────────────────────
export function RecipesPage() {
  const [tab, setTab] = useState<'recipes' | 'week' | 'fridge'>('recipes')
  const { items } = useFridgeStore()

  return (
    <div className="page animate-in stack stack-lg">
      <div className="page-header">
        <h1>Рецепты</h1>
      </div>

      <div className={styles.tabs}>
        <button
          className={[styles.tab, tab === 'recipes' ? styles.tabActive : ''].join(' ')}
          onClick={() => setTab('recipes')}
        >🍲 Рецепты</button>
        <button
          className={[styles.tab, tab === 'week' ? styles.tabActive : ''].join(' ')}
          onClick={() => setTab('week')}
        >📅 Неделя</button>
        <button
          className={[styles.tab, tab === 'fridge' ? styles.tabActive : ''].join(' ')}
          onClick={() => setTab('fridge')}
        >🧊 Холодильник</button>
      </div>

      {tab === 'recipes' && <RecipesTab fridge={items} />}
      {tab === 'week'    && <WeekTab fridge={items} />}
      {tab === 'fridge'  && <FridgeTab items={items} />}
    </div>
  )
}
