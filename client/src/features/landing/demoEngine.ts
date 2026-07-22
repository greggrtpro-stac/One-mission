/**
 * Moteur de la démo interactive de la landing page (mockup sous le hero).
 *
 * Porté quasi verbatim depuis l'export Claude Design (classe JS avec état
 * local, rendu par chaînes de template et délégation d'événements
 * `data-act`) plutôt que réécrit en hooks React : ce moteur ne touche à
 * aucune donnée réelle (tout est fictif, réinitialisé au rechargement), donc
 * le risque de casser une interaction (CRUD quêtes, timer DeepWork,
 * planning...) en le retranscrivant à la main dépasse largement le bénéfice
 * d'un style plus "React idiomatique".
 */

type Root = HTMLElement & { _d: any }

export class DemoEngine {
  private xpForLevel = (lvl: number) => Math.round(100 * Math.pow(lvl, 1.5))

  private NAV_STARTER: [string, string, string][] = [
    ['dashboard', 'Tableau de bord', 'layout-dashboard'],
    ['quests', 'Quêtes', 'swords'],
    ['weekly', 'Hebdomadaires', 'calendar-check'],
    ['routines', 'Routine', 'repeat'],
    ['planning', 'Planning', 'calendar-days'],
    ['deepwork', 'DeepWork', 'timer'],
    ['addictions', 'Addictions', 'shield-check'],
    ['journal', 'Journal', 'book-open-text'],
    ['leaderboard', 'Classement', 'trophy'],
    ['guilds', 'Guildes', 'castle'],
    ['friends', 'Amis', 'users'],
  ]
  private NAV_STATIC: [string, string][] = [
    ['Level Up', 'rocket'],
    ['Nouveautés', 'sparkles'],
  ]
  private CATS: [string, string][] = [
    ['Deep Work', '#8b5cf6'],
    ['Travail', '#8b5cf6'],
    ['Études', '#3b82f6'],
    ['Sport', '#22c55e'],
    ['Santé', '#f04444'],
    ['Lecture', '#a78bfa'],
    ['Business', '#f5b93d'],
    ['Personnel', '#f59e0b'],
    ['Loisirs', '#22d3ee'],
    ['Autre', '#8f8f98'],
  ]
  private PRIOS = ['Basse', 'Moyenne', 'Haute', 'Urgente']
  private PDAYS: [string, number][] = [
    ['Lun', 20],
    ['Mar', 21],
    ['Mer', 22],
    ['Jeu', 23],
    ['Ven', 24],
    ['Sam', 25],
    ['Dim', 26],
  ]
  private NQCATS: [string, string][] = [
    ['Perso', '#a78bfa'],
    ['Sport', '#22c55e'],
    ['Études', '#3b82f6'],
    ['Admin', '#f5b93d'],
    ['Bien-être', '#a78bfa'],
    ['Travail', '#8b5cf6'],
  ]

  private renderIcons: () => void

  constructor(renderIcons: () => void) {
    this.renderIcons = renderIcons
  }

  mount(root: HTMLElement) {
    ;(root as Root)._d = this.makeState()
    root.addEventListener('click', (e) => {
      const el = (e.target as HTMLElement).closest('[data-act]') as HTMLElement | null
      if (!el || !root.contains(el)) return
      this.act(root as Root, el.dataset.act!, el.dataset.id, el)
    })
    root.addEventListener('keydown', (e) => {
      const d = (root as Root)._d
      if (e.key === 'Escape') {
        if (d.pconfirm) {
          e.preventDefault()
          this.act(root as Root, 'pcancel', undefined, null)
          return
        }
        if (d.pmodal) {
          e.preventDefault()
          this.act(root as Root, 'pclose', undefined, null)
          return
        }
        if (d.mqmodal) {
          e.preventDefault()
          this.act(root as Root, 'mqclose', undefined, null)
          return
        }
        if (d.nqmodal) {
          e.preventDefault()
          this.act(root as Root, 'nqclose', undefined, null)
          return
        }
      }
      if (e.key !== 'Enter') return
      const inp = (e.target as HTMLElement).closest('[data-enter]') as HTMLElement | null
      if (inp) {
        e.preventDefault()
        this.act(root as Root, inp.dataset.enter!, inp.dataset.id, inp)
      }
    })
    this.renderApp(root as Root)
  }

  destroy(root: HTMLElement) {
    const d = (root as Root)._d
    if (d?.dw?.timer) clearInterval(d.dw.timer)
  }

  private catColor(name: string) {
    const c = this.CATS.find((x) => x[0] === name)
    return c ? c[1] : '#a78bfa'
  }

  private loadPlanning(): Record<string, any[]> {
    return {
      Lun: [
        { id: 1, t: 'Cardio', desc: '', ti: '08:00', end: '09:00', cat: 'Sport', prio: 'Moyenne', reminder: '10 min avant', notes: '', done: true },
        { id: 2, t: 'Design', desc: '', ti: '10:00', end: '12:00', cat: 'Deep Work', prio: 'Haute', reminder: 'Aucun', notes: '', done: false },
      ],
      Mar: [
        { id: 3, t: 'Code', desc: '', ti: '09:00', end: '11:00', cat: 'Deep Work', prio: 'Haute', reminder: 'Aucun', notes: '', done: true },
        { id: 4, t: 'Réunion projet', desc: '', ti: '15:00', end: '16:00', cat: 'Travail', prio: 'Moyenne', reminder: '10 min avant', notes: '', done: false },
      ],
      Mer: [{ id: 5, t: 'Lecture', desc: '', ti: '11:00', end: '12:00', cat: 'Lecture', prio: 'Basse', reminder: 'Aucun', notes: '', done: false }],
      Jeu: [
        { id: 6, t: 'Code', desc: '', ti: '09:00', end: '11:00', cat: 'Deep Work', prio: 'Haute', reminder: 'Aucun', notes: '', done: false },
        { id: 7, t: 'Sport', desc: '', ti: '18:00', end: '19:00', cat: 'Sport', prio: 'Moyenne', reminder: 'Aucun', notes: '', done: false },
      ],
      Ven: [{ id: 8, t: 'Marketing', desc: '', ti: '10:00', end: '12:00', cat: 'Business', prio: 'Moyenne', reminder: 'Aucun', notes: '', done: false }],
      Sam: [{ id: 9, t: 'Courses', desc: '', ti: '10:00', end: '11:00', cat: 'Personnel', prio: 'Basse', reminder: 'Aucun', notes: '', done: false }],
      Dim: [
        { id: 10, t: 'Code', desc: '', ti: '09:00', end: '10:00', cat: 'Deep Work', prio: 'Haute', reminder: 'Aucun', notes: '', done: false },
        { id: 11, t: 'Haut du corps', desc: '', ti: '14:00', end: '15:00', cat: 'Sport', prio: 'Moyenne', reminder: 'Aucun', notes: '', done: false },
      ],
    }
  }

  private savePlanning(_d: any) {
    /* démo : modifications temporaires, réinitialisées au rechargement */
  }

  private minsOf(t: string) {
    const [h, m] = String(t).split(':').map(Number)
    return h * 60 + (m || 0)
  }
  private fmtDur(a: string, b: string) {
    let n = this.minsOf(b) - this.minsOf(a)
    if (n < 0) n = 0
    const h = Math.floor(n / 60),
      m = n % 60
    return (h ? h + ' h' : '') + (m ? ' ' + String(m).padStart(2, '0') : h ? '' : '0 min')
  }

  private syncNq(root: Root) {
    const m = root._d.nqmodal
    if (!m) return
    const g = (s: string) => {
      const el = root.querySelector(s) as HTMLInputElement | null
      return el ? el.value : undefined
    }
    const t = g('.omn-title')
    if (t !== undefined) m.t = t
    const de = g('.omn-desc')
    if (de !== undefined) m.desc = de
    const ti = g('.omn-time')
    if (ti !== undefined) m.time = ti
  }

  private nqModal(d: any): string {
    const m = d.nqmodal
    if (!m) return ''
    const esc = (s: any) =>
      String(s || '')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
    const fld = (label: string, inner: string) =>
      `<div style="display:flex;flex-direction:column;gap:6px"><label style="font-size:12px;font-weight:500;color:#c9c9d0">${label}</label>${inner}</div>`
    const diffs: [string, string][] = [
      ['Très facile', 'Très facile • 10 XP'],
      ['Facile', 'Facile • 25 XP'],
      ['Moyenne', 'Moyenne • 50 XP'],
      ['Difficile', 'Difficile • 100 XP'],
      ['Très difficile', 'Très difficile • 250 XP'],
    ]
    const toggle = `<span class="omd-btn" data-act="nqtoggle" style="width:44px;height:26px;flex:none;border-radius:99px;position:relative;transition:background .2s ease;background:${m.addPlan ? '#8b5cf6' : 'rgba(255,255,255,.14)'}"><span style="position:absolute;top:3px;${m.addPlan ? 'right:3px' : 'left:3px'};width:20px;height:20px;border-radius:99px;background:#fff;transition:all .2s ease"></span></span>`
    return `<div data-act="nqclose" style="position:absolute;inset:0;z-index:60;background:rgba(0,0,0,.35);backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px);display:flex;align-items:flex-start;justify-content:center;padding:40px 16px;overflow:auto;cursor:default">
      <div data-act="noop" style="width:100%;max-width:520px;background:#0e0e13;border:1px solid rgba(255,255,255,.12);border-radius:18px;box-shadow:0 40px 100px -30px rgba(0,0,0,.9);overflow:visible;cursor:default;animation:omPop .18s cubic-bezier(.16,1,.3,1) both">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid rgba(255,255,255,.07)"><h2 style="margin:0;font-size:16px;font-weight:600">Nouvelle quête</h2><span class="omd-btn" data-act="nqclose" style="padding:6px;border-radius:8px;color:#8f8f98;display:inline-flex"><i data-lucide="x" width="18" height="18"></i></span></div>
        <div style="padding:22px;display:flex;flex-direction:column;gap:16px">
          ${fld('Titre', `<input class="omd-input omn-title" value="${esc(m.t)}" placeholder="Ex. : Courir 5 km">`)}
          ${fld('Description (facultatif)', `<textarea class="omd-input omn-desc" style="height:76px;padding:10px 11px;resize:none" placeholder="Détails, contexte, critères de réussite...">${esc(m.desc)}</textarea>`)}
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">${this.ddField('cat', 'Catégorie', this.NQCATS.map(([n, c]) => [n, '<span style="width:9px;height:9px;border-radius:99px;flex:none;background:' + c + '"></span>' + n]), m)}${this.ddField('prio', 'Priorité', this.PRIOS.map((p) => [p, p]), m)}</div>
          ${this.ddField('diff', 'Difficulté', diffs, m)}
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">${this.ddField('day', 'Date', this.PDAYS.map(([dy, n]) => [dy, dy + ' ' + n + ' juil.']), m)}${fld('Heure (facultatif)', `<input class="omd-input omn-time" type="time" value="${esc(m.time)}">`)}</div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:14px 16px"><div><p style="margin:0;font-size:13.5px;font-weight:600">Ajouter au Planning</p><p style="margin:4px 0 0;font-size:12px;line-height:1.5;color:#8f8f98">Réserve un créneau dans ton calendrier pour cette quête.</p></div>${toggle}</div>
        </div>
        <div style="display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:16px 22px;border-top:1px solid rgba(255,255,255,.07)"><span class="omd-btn" data-act="nqclose" style="height:40px;display:inline-flex;align-items:center;padding:0 18px;border-radius:9px;border:1px solid rgba(255,255,255,.12);color:#f6f6f4;font-size:13px;font-weight:600">Annuler</span><span class="omd-btn" data-act="nqsave" style="height:40px;display:inline-flex;align-items:center;gap:7px;padding:0 20px;border-radius:9px;background:#8b5cf6;color:#fff;font-size:13px;font-weight:600"><i data-lucide="plus" width="15" height="15"></i>Créer la quête</span></div>
      </div>
    </div>`
  }

  private syncMq(root: Root) {
    const m = root._d.mqmodal
    if (!m) return
    const g = (s: string) => {
      const el = root.querySelector(s) as HTMLInputElement | null
      return el ? el.value : undefined
    }
    const t = g('.omq-title')
    if (t !== undefined) m.t = t
    const de = g('.omq-desc')
    if (de !== undefined) m.desc = de
    const da = g('.omq-date')
    if (da !== undefined) m.date = da
    const rows = root.querySelectorAll('.omq-ms')
    if (rows.length) m.milestones = Array.from(rows).map((el) => (el as HTMLInputElement).value)
  }

  private mqModal(d: any): string {
    const m = d.mqmodal
    if (!m) return ''
    const esc = (s: any) =>
      String(s || '')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
    const fld = (label: string, inner: string) =>
      `<div style="display:flex;flex-direction:column;gap:6px"><label style="font-size:12px;font-weight:500;color:#c9c9d0">${label}</label>${inner}</div>`
    const ms = m.milestones
      .map(
        (v: string, i: number) =>
          `<div style="display:flex;align-items:center;gap:8px"><input class="omd-input omq-ms" value="${esc(v)}" placeholder="Nom de l'étape" style="flex:1"><span class="omd-btn" data-act="mqmdel" data-id="${i}" style="width:34px;height:34px;flex:none;display:inline-flex;align-items:center;justify-content:center;border-radius:8px;border:1px solid rgba(255,255,255,.1);color:#8f8f98"><i data-lucide="trash-2" width="15" height="15"></i></span></div>`,
      )
      .join('')
    return `<div data-act="mqclose" style="position:absolute;inset:0;z-index:60;background:rgba(0,0,0,.35);backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px);display:flex;align-items:flex-start;justify-content:center;padding:40px 16px;overflow:auto;cursor:default">
      <div data-act="noop" style="width:100%;max-width:520px;background:#0e0e13;border:1px solid rgba(255,255,255,.12);border-radius:18px;box-shadow:0 40px 100px -30px rgba(0,0,0,.9);overflow:visible;cursor:default;animation:omPop .18s cubic-bezier(.16,1,.3,1) both">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid rgba(255,255,255,.07)"><h2 style="margin:0;font-size:16px;font-weight:600">Modifier la quête principale</h2><span class="omd-btn" data-act="mqclose" style="padding:6px;border-radius:8px;color:#8f8f98;display:inline-flex"><i data-lucide="x" width="18" height="18"></i></span></div>
        <div style="padding:22px;display:flex;flex-direction:column;gap:16px">
          ${fld('Objectif principal', `<input class="omd-input omq-title" value="${esc(m.t)}" placeholder="Nom de ta quête principale">`)}
          ${fld('Description (facultatif)', `<textarea class="omd-input omq-desc" style="height:80px;padding:10px 11px;resize:none" placeholder="Pourquoi cet objectif compte, à quoi ressemble la réussite...">${esc(m.desc)}</textarea>`)}
          ${fld('Date cible (facultatif)', `<div style="position:relative"><input class="omd-input omq-date" value="${esc(m.date)}" placeholder="ex. mar. 1 déc." style="width:100%;padding-right:38px"><i data-lucide="calendar" width="16" height="16" style="position:absolute;right:12px;top:9px;color:#8f8f98;pointer-events:none"></i></div>`)}
          <div style="border-top:1px solid rgba(255,255,255,.07);padding-top:16px">
            <h3 style="margin:0;font-size:14px;font-weight:600">Jalons</h3>
            <p style="margin:5px 0 0;font-size:12px;line-height:1.5;color:#8f8f98">Découpe ta mission en étapes : la progression se calcule automatiquement.</p>
            <div style="margin-top:14px;display:flex;flex-direction:column;gap:8px">${ms}</div>
            <span class="omd-btn" data-act="mqmadd" style="margin-top:12px;height:36px;display:inline-flex;align-items:center;gap:7px;padding:0 14px;border-radius:9px;border:1px dashed rgba(255,255,255,.16);color:#a78bfa;font-size:13px;font-weight:600"><i data-lucide="plus" width="15" height="15"></i>Ajouter un jalon</span>
          </div>
        </div>
        <div style="display:flex;align-items:center;justify-content:flex-end;gap:10px;padding:16px 22px;border-top:1px solid rgba(255,255,255,.07)"><span class="omd-btn" data-act="mqclose" style="height:40px;display:inline-flex;align-items:center;padding:0 18px;border-radius:9px;border:1px solid rgba(255,255,255,.12);color:#f6f6f4;font-size:13px;font-weight:600">Annuler</span><span class="omd-btn" data-act="mqsave" style="height:40px;display:inline-flex;align-items:center;gap:7px;padding:0 20px;border-radius:9px;background:#8b5cf6;color:#fff;font-size:13px;font-weight:600"><i data-lucide="check" width="15" height="15"></i>Enregistrer</span></div>
      </div>
    </div>`
  }

  private syncModal(root: Root) {
    const m = root._d.pmodal
    if (!m) return
    const g = (s: string) => {
      const el = root.querySelector(s) as HTMLInputElement | null
      return el ? el.value : undefined
    }
    const t = g('.omd-m-title')
    if (t !== undefined) m.t = t
    const de = g('.omd-m-desc')
    if (de !== undefined) m.desc = de
    const no = g('.omd-m-notes')
    if (no !== undefined) m.notes = no
    const s = g('.omd-m-start')
    if (s !== undefined) m.ti = s
    const e = g('.omd-m-end')
    if (e !== undefined) m.end = e
  }

  private ddField(field: string, label: string, items: [string, string][], m: any): string {
    const cur = items.find((x) => x[0] === m[field]) || items[0]
    const open = m.open === field
    const rows = items
      .map(
        ([v, html]) =>
          `<div class="omd-dd-row" data-act="ddpick" data-id="${field}:${v}" style="${v === m[field] ? 'background:rgba(139,92,246,.14);color:#c4b5fd;' : 'color:#f6f6f4;'}">${html}${v === m[field] ? "<i data-lucide='check' width='14' height='14' style='margin-left:auto;color:#a78bfa'></i>" : ''}</div>`,
      )
      .join('')
    return `<div style="display:flex;flex-direction:column;gap:6px;position:relative"><label style="font-size:12px;font-weight:500;color:#c9c9d0">${label}</label>
      <div data-act="ddtoggle" data-id="${field}" style="height:34px;display:flex;align-items:center;gap:8px;border-radius:8px;border:1px solid ${open ? '#8b5cf6' : 'rgba(255,255,255,.1)'};background:rgba(255,255,255,.02);padding:0 11px;font-size:12.5px;color:#f6f6f4;cursor:pointer;${open ? 'box-shadow:0 0 0 3px rgba(139,92,246,.18);' : ''}">${cur[1]}<i data-lucide="chevron-down" width="15" height="15" style="margin-left:auto;color:#8f8f98;transition:transform .15s ease;${open ? 'transform:rotate(180deg)' : ''}"></i></div>
      ${open ? `<div style="position:absolute;top:100%;left:0;right:0;margin-top:6px;z-index:20;background:#1B1B22;border:1px solid #2A2A34;border-radius:10px;box-shadow:0 20px 50px -12px rgba(0,0,0,.75);padding:5px;max-height:196px;overflow:auto">${rows}</div>` : ''}
    </div>`
  }

  private confirmModal(d: any): string {
    const c = d.pconfirm
    if (!c) return ''
    const esc = (s: any) => String(s || '').replace(/</g, '&lt;')
    return `<div data-act="pcancel" style="position:absolute;inset:0;z-index:80;background:rgba(0,0,0,.4);backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px);display:flex;align-items:center;justify-content:center;padding:24px;cursor:default">
      <div data-act="noop" style="width:100%;max-width:420px;background:#1B1B22;border:1px solid #2A2A34;border-radius:18px;box-shadow:0 40px 100px -30px rgba(0,0,0,.9);padding:24px;cursor:default;animation:omPop .18s cubic-bezier(.16,1,.3,1) both">
        <div style="display:flex;gap:16px;align-items:flex-start"><span style="width:44px;height:44px;flex:none;display:flex;align-items:center;justify-content:center;border-radius:99px;background:rgba(240,68,68,.16);color:#f04444"><i data-lucide="trash-2" width="20" height="20"></i></span><div style="flex:1;min-width:0"><h2 style="margin:0;font-size:16px;font-weight:600;line-height:1.35">Supprimer l'événement « ${esc(c.name)} » ?</h2><p style="margin:8px 0 0;font-size:13px;line-height:1.5;color:#8f8f98">Cet événement sera définitivement supprimé du Planning. Cette opération est irréversible.</p></div></div>
        <div style="margin-top:22px;display:flex;justify-content:flex-end;gap:10px"><span class="omd-btn" data-act="pcancel" style="height:40px;display:inline-flex;align-items:center;padding:0 18px;border-radius:9px;border:1px solid rgba(255,255,255,.12);color:#f6f6f4;font-size:13px;font-weight:600">Annuler</span><span class="omd-btn" data-act="pconfirmdel" style="height:40px;display:inline-flex;align-items:center;gap:7px;padding:0 20px;border-radius:9px;background:#8b5cf6;color:#fff;font-size:13px;font-weight:600"><i data-lucide="trash-2" width="15" height="15"></i>Supprimer</span></div>
      </div>
    </div>`
  }

  private planningModal(d: any): string {
    const m = d.pmodal
    if (!m) return ''
    const esc = (s: any) =>
      String(s || '')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
    const editing = m.id != null
    const fld = (label: string, inner: string) =>
      `<div style="display:flex;flex-direction:column;gap:6px"><label style="font-size:12px;font-weight:500;color:#c9c9d0">${label}</label>${inner}</div>`
    return `<div data-act="pclose" style="position:absolute;inset:0;z-index:60;background:rgba(0,0,0,.35);backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px);display:flex;align-items:flex-start;justify-content:center;padding:40px 16px;overflow:auto;cursor:default">
      <div data-act="noop" style="width:100%;max-width:520px;background:#0e0e13;border:1px solid rgba(255,255,255,.12);border-radius:18px;box-shadow:0 40px 100px -30px rgba(0,0,0,.9);overflow:visible;cursor:default">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 22px;border-bottom:1px solid rgba(255,255,255,.07)"><h2 style="margin:0;font-size:16px;font-weight:600">${editing ? "Modifier l'événement" : 'Nouvel événement'}</h2><span class="omd-btn" data-act="pclose" style="padding:6px;border-radius:8px;color:#8f8f98;display:inline-flex"><i data-lucide="x" width="18" height="18"></i></span></div>
        <div style="padding:22px;display:flex;flex-direction:column;gap:14px">
          ${fld('Titre', `<input class="omd-input omd-m-title" value="${esc(m.t)}" placeholder="Titre de l'événement">`)}
          ${fld('Description', `<input class="omd-input omd-m-desc" value="${esc(m.desc)}" placeholder="Courte description (optionnel)">`)}
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">${this.ddField('day', 'Date', this.PDAYS.map(([dy, n]) => [dy, dy + ' ' + n + ' juil.']), m)}${fld('Début', `<input class="omd-input omd-m-start" type="time" value="${esc(m.ti)}">`)}${fld('Fin', `<input class="omd-input omd-m-end" type="time" value="${esc(m.end)}">`)}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">${this.ddField('cat', 'Catégorie', this.CATS.map(([n, c]) => [n, '<span style="width:9px;height:9px;border-radius:99px;flex:none;background:' + c + '"></span>' + n]), m)}${this.ddField('prio', 'Priorité', this.PRIOS.map((p) => [p, p]), m)}</div>
          ${this.ddField(
            'reminder',
            'Rappel',
            ['Aucun', '10 min avant', '30 min avant', '1 h avant', '1 jour avant'].map((r) => [r, r]),
            m,
          )}
          ${fld('Notes', `<textarea class="omd-input omd-m-notes" style="height:70px;padding:10px 11px;resize:none" placeholder="Notes (optionnel)">${esc(m.notes)}</textarea>`)}
        </div>
        <div style="display:flex;align-items:center;justify-content:${editing ? 'space-between' : 'flex-end'};gap:10px;padding:16px 22px;border-top:1px solid rgba(255,255,255,.07)">
          ${editing ? `<span class="omd-btn" data-act="pdelete" style="height:40px;display:inline-flex;align-items:center;gap:7px;padding:0 16px;border-radius:9px;background:rgba(240,68,68,.14);color:#f04444;font-size:13px;font-weight:600"><i data-lucide="trash-2" width="15" height="15"></i>Supprimer l'événement</span>` : ''}
          <div style="display:flex;gap:10px"><span class="omd-btn" data-act="pclose" style="height:40px;display:inline-flex;align-items:center;padding:0 18px;border-radius:9px;border:1px solid rgba(255,255,255,.12);color:#f6f6f4;font-size:13px;font-weight:600">Annuler</span><span class="omd-btn" data-act="psave" style="height:40px;display:inline-flex;align-items:center;gap:7px;padding:0 20px;border-radius:9px;background:#8b5cf6;color:#fff;font-size:13px;font-weight:600"><i data-lucide="check" width="15" height="15"></i>${editing ? 'Enregistrer' : "Créer l'événement"}</span></div>
        </div>
      </div>
    </div>`
  }

  private makeState(): any {
    return {
      tab: 'dashboard',
      level: 7,
      xp: 1260,
      totalXp: 4316,
      streak: 12,
      quests: [
        { id: 1, t: 'Séance de sport — haut du corps', cat: 'Sport', col: '#22c55e', xp: 50, done: false },
        { id: 2, t: 'Réviser le chapitre 4 — analyse', cat: 'Études', col: '#3b82f6', xp: 100, done: false },
        { id: 3, t: 'Appeler le banquier', cat: 'Admin', col: '#f5b93d', xp: 10, done: false },
        { id: 4, t: 'Méditation 10 min', cat: 'Bien-être', col: '#a78bfa', xp: 25, done: true },
      ],
      nextId: 5,
      habits: [
        { t: 'Lecture 20 min', done: true },
        { t: "Boire 2 L d'eau", done: true },
        { t: 'Sport', done: true },
        { t: 'Pas de sucre', done: false },
        { t: 'Coucher avant 23 h', done: true },
      ],
      routines: {
        Matin: [
          { t: 'douche froide', days: [1, 1, 1, 1, 0, 0, 0] },
          { t: 'skincare', days: [1, 0, 1, 0, 0, 0, 0] },
        ],
        Soir: [{ t: 'méditation', days: [0, 0, 1, 0, 1, 0, 0] }],
      },
      objectives: [
        { t: 'Lancer mon SaaS avant septembre', pct: 45 },
        { t: 'Courir un 10 km', pct: 60 },
        { t: 'Économiser 5 000 €', pct: 30 },
      ],
      addictionDays: 34,
      addictionRecord: 41,
      dw: { sec: 5100, running: false, timer: null as any },
      planning: this.loadPlanning(),
      pmodal: null,
      mainQuest: { t: '5000€/mois', desc: '', date: '', pct: 0, milestones: [] as string[] },
      mqmodal: null,
      nqmodal: null,
      weekly: [
        { t: 'courir 5km', xp: 50, done: false },
        { t: 'travailler', xp: 50, done: true },
      ],
      journalSel: 0,
      journal: [
        { d: "Aujourd'hui", written: false, score: null, txt: '' },
        {
          d: 'Hier',
          written: true,
          score: 8,
          txt: "Bonne journée : sport le matin, 2 h de deep work sur le SaaS. Un peu de procrastination l'après-midi mais j'ai tenu mes quêtes.",
          pos: ['Séance de sport tenue', 'Deep work productif'],
          imp: ['Procrastination en après-midi'],
          adv: ['Planifie un bloc focus après le déjeuner'],
        },
        {
          d: 'Vendredi 18 juillet',
          written: true,
          score: 6,
          txt: "Journée moyenne, fatigue. J'ai quand même écrit le journal.",
          pos: ['Régularité du journal'],
          imp: ['Sommeil insuffisant'],
          adv: ['Coucher avant 23 h'],
        },
      ],
      leaderboard: [
        { rank: 1, name: 'Nova', level: 14, xp: 18420, streak: 31 },
        { rank: 2, name: 'Kaizen', level: 12, xp: 15230, streak: 22 },
        { rank: 3, name: 'Milo', level: 11, xp: 13980, streak: 9 },
        { rank: 4, name: 'Sacha', level: 9, xp: 9120, streak: 5 },
        { rank: 5, name: 'Alex', level: 7, xp: 4316, streak: 12, me: true },
        { rank: 6, name: 'Théo', level: 6, xp: 3870, streak: 0 },
        { rank: 7, name: 'Lina', level: 6, xp: 3540, streak: 3 },
      ],
      lbTab: 'players',
      guildLeaderboard: [
        { rank: 1, name: 'Les Stoïciens', members: 24, xp: 142000 },
        { rank: 2, name: 'Deep Focus Club', members: 18, xp: 98500 },
        { rank: 3, name: 'Aube 5 h', members: 12, xp: 64200 },
      ],
      friends: [
        { name: 'Kaizen', level: 12, online: true },
        { name: 'Milo', level: 11, online: false, seen: 'il y a 3 h' },
        { name: 'Lina', level: 6, online: true },
      ],
      friendReq: [{ name: 'Sacha', level: 9, ago: 'il y a 2 h' }],
      changelog: [
        {
          v: '1.0',
          date: '15 juillet 2026',
          title: 'Lancement de la bêta',
          changes: [
            ['new', 'Quêtes, DeepWork, journal et classement disponibles'],
            ['new', 'Guildes et amis pour progresser en équipe'],
            ['improvement', 'Tableau de bord repensé'],
          ],
        },
        {
          v: '0.9',
          date: '28 juin 2026',
          title: 'Routines & habitudes',
          changes: [
            ['new', 'Suivi de routine hebdomadaire'],
            ['fix', 'Correction du calcul de série'],
          ],
        },
      ],
    }
  }

  private act(root: Root, a: string, id: string | undefined, _el: HTMLElement | null) {
    const d = root._d
    switch (a) {
      case 'nav':
        if (d.tab !== id) {
          d.tab = id
          this.renderApp(root)
        }
        return
      case 'qtoggle': {
        const q = d.quests.find((x: any) => x.id == id)
        if (q) {
          q.done = !q.done
          this.gainXp(d, q.done ? q.xp : -q.xp)
        }
        this.renderApp(root)
        return
      }
      case 'qdel':
        d.quests = d.quests.filter((x: any) => x.id != id)
        this.renderApp(root)
        return
      case 'qadd': {
        const inp = root.querySelector('.omd-qnew') as HTMLInputElement | null
        const v = inp && inp.value.trim()
        if (v) d.quests.push({ id: d.nextId++, t: v, cat: 'Perso', col: '#a78bfa', xp: 50, done: false })
        this.renderApp(root)
        return
      }
      case 'htoggle': {
        const h = d.habits[Number(id)]
        if (h) h.done = !h.done
        this.renderApp(root)
        return
      }
      case 'wtoggle': {
        const w = d.weekly[Number(id)]
        if (w) w.done = !w.done
        this.renderApp(root)
        return
      }
      case 'jsel':
        d.journalSel = Number(id)
        this.renderApp(root)
        return
      case 'lbtab':
        d.lbTab = id
        this.renderApp(root)
        return
      case 'rtoggle': {
        const [sec, i, day] = id!.split(':')
        const it = d.routines[sec][Number(i)]
        if (it) it.days[Number(day)] = it.days[Number(day)] ? 0 : 1
        this.renderApp(root)
        return
      }
      case 'oinc': {
        const o = d.objectives[Number(id)]
        if (o) o.pct = Math.min(100, o.pct + 5)
        this.renderApp(root)
        return
      }
      case 'odec': {
        const o = d.objectives[Number(id)]
        if (o) o.pct = Math.max(0, o.pct - 5)
        this.renderApp(root)
        return
      }
      case 'dwstart':
        if (!d.dw.running) {
          d.dw.running = true
          d.dw.timer = setInterval(() => this.tickDw(root), 1000)
        }
        this.renderApp(root)
        return
      case 'dwpause':
        d.dw.running = false
        clearInterval(d.dw.timer)
        this.renderApp(root)
        return
      case 'dwstop':
        d.dw.running = false
        clearInterval(d.dw.timer)
        d.dw.sec = 0
        this.renderApp(root)
        return
      case 'addreset':
        d.addictionDays = 0
        this.renderApp(root)
        return
      case 'addplus':
        d.addictionDays += 1
        if (d.addictionDays > d.addictionRecord) d.addictionRecord = d.addictionDays
        this.renderApp(root)
        return
      case 'noop':
        return
      case 'mqopen': {
        const q = d.mainQuest
        d.mqmodal = { t: q.t, desc: q.desc || '', date: q.date || '', milestones: (q.milestones || []).slice() }
        this.renderApp(root)
        return
      }
      case 'mqclose':
        d.mqmodal = null
        this.renderApp(root)
        return
      case 'mqmadd':
        this.syncMq(root)
        d.mqmodal.milestones.push('')
        this.renderApp(root)
        return
      case 'mqmdel':
        this.syncMq(root)
        d.mqmodal.milestones.splice(Number(id), 1)
        this.renderApp(root)
        return
      case 'mqsave': {
        this.syncMq(root)
        const m = d.mqmodal
        d.mainQuest.t = (m.t || '').trim() || d.mainQuest.t
        d.mainQuest.desc = (m.desc || '').trim()
        d.mainQuest.date = (m.date || '').trim()
        d.mainQuest.milestones = m.milestones.map((x: string) => x.trim()).filter(Boolean)
        d.mqmodal = null
        this.renderApp(root)
        return
      }
      case 'ddtoggle': {
        this.syncModal(root)
        this.syncNq(root)
        const m = d.nqmodal || d.pmodal
        if (m) m.open = m.open === id ? null : id
        this.renderApp(root)
        return
      }
      case 'ddpick': {
        this.syncModal(root)
        this.syncNq(root)
        const m = d.nqmodal || d.pmodal
        if (m) {
          const ix = id!.indexOf(':')
          m[id!.slice(0, ix)] = id!.slice(ix + 1)
          m.open = null
        }
        this.renderApp(root)
        return
      }
      case 'nqopen':
        d.nqmodal = { t: '', desc: '', cat: 'Perso', prio: 'Moyenne', diff: 'Moyenne', day: 'Mar', time: '', addPlan: false, open: null }
        this.renderApp(root)
        return
      case 'nqclose':
        d.nqmodal = null
        this.renderApp(root)
        return
      case 'freqok': {
        d.friends.forEach((f: any) => (f.isNew = false))
        const r = d.friendReq.find((x: any) => x.name == id)
        if (r) {
          d.friends.unshift({ name: r.name, level: r.level, online: true, isNew: true })
          d.friendReq = d.friendReq.filter((x: any) => x.name != id)
        }
        this.renderApp(root)
        return
      }
      case 'freqno':
        d.friendReq = d.friendReq.filter((x: any) => x.name != id)
        this.renderApp(root)
        return
      case 'nqtoggle':
        this.syncNq(root)
        d.nqmodal.addPlan = !d.nqmodal.addPlan
        this.renderApp(root)
        return
      case 'nqsave': {
        this.syncNq(root)
        const m = d.nqmodal
        if (!m) return
        const xpMap: Record<string, number> = { 'Très facile': 10, Facile: 25, Moyenne: 50, Difficile: 100, 'Très difficile': 250 }
        const catC = (this.NQCATS.find((c) => c[0] === m.cat) || ['', '#a78bfa'])[1]
        const xp = xpMap[m.diff] || 50
        const id2 = d.nextId++
        d.quests.push({ id: id2, t: (m.t || '').trim() || 'Nouvelle quête', cat: m.cat, col: catC, xp, done: false })
        if (m.addPlan) {
          const start = m.time || '09:00'
          const eh = String(Math.min(23, parseInt(start) + 1)).padStart(2, '0') + ':' + (start.split(':')[1] || '00')
          d.planning[m.day].push({ id: 'q' + id2, t: (m.t || '').trim() || 'Nouvelle quête', desc: '', ti: start, end: eh, cat: 'Travail', prio: m.prio, reminder: 'Aucun', notes: '', done: false })
          d.planning[m.day].sort((x: any, y: any) => x.ti.localeCompare(y.ti))
        }
        d.nqmodal = null
        this.renderApp(root)
        return
      }
      case 'pnew':
        d.pmodal = { day: 'Mar', t: '', desc: '', ti: '09:00', end: '10:00', cat: 'Deep Work', prio: 'Moyenne', reminder: 'Aucun', notes: '', done: false, id: null, oldDay: null }
        this.renderApp(root)
        return
      case 'pedit': {
        const [day, i] = id!.split(':')
        const ev = d.planning[day][Number(i)]
        d.pmodal = Object.assign({}, ev, { day, oldDay: day })
        this.renderApp(root)
        return
      }
      case 'pclose':
        d.pmodal = null
        this.renderApp(root)
        return
      case 'psave': {
        const m = d.pmodal
        if (!m) return
        this.syncModal(root)
        m.t = (m.t || '').trim() || 'Sans titre'
        m.desc = (m.desc || '').trim()
        m.notes = (m.notes || '').trim()
        if (m.id == null) {
          const maxId = Object.values(d.planning as Record<string, any[]>)
            .flat()
            .reduce((mx: number, e: any) => Math.max(mx, e.id || 0), 100)
          m.id = maxId + 1
          d.planning[m.day].push({ id: m.id, t: m.t, desc: m.desc, ti: m.ti, end: m.end, cat: m.cat, prio: m.prio, reminder: m.reminder, notes: m.notes, done: false })
        } else {
          if (m.oldDay && m.oldDay !== m.day) d.planning[m.oldDay] = d.planning[m.oldDay].filter((e: any) => e.id !== m.id)
          const arr = d.planning[m.day]
          const ex = arr.find((e: any) => e.id === m.id)
          if (ex) Object.assign(ex, { t: m.t, desc: m.desc, ti: m.ti, end: m.end, cat: m.cat, prio: m.prio, reminder: m.reminder, notes: m.notes })
          else arr.push({ id: m.id, t: m.t, desc: m.desc, ti: m.ti, end: m.end, cat: m.cat, prio: m.prio, reminder: m.reminder, notes: m.notes, done: false })
        }
        d.planning[m.day].sort((x: any, y: any) => x.ti.localeCompare(y.ti))
        d.pmodal = null
        this.savePlanning(d)
        this.renderApp(root)
        return
      }
      case 'pdelete': {
        const m = d.pmodal
        if (!m || m.id == null) {
          d.pmodal = null
          this.renderApp(root)
          return
        }
        d.pconfirm = { day: m.day, id: m.id, name: m.t }
        this.renderApp(root)
        return
      }
      case 'pcancel':
        d.pconfirm = null
        this.renderApp(root)
        return
      case 'pconfirmdel': {
        const c = d.pconfirm
        if (c) {
          d.planning[c.day] = d.planning[c.day].filter((e: any) => e.id !== c.id)
          this.savePlanning(d)
        }
        d.pconfirm = null
        d.pmodal = null
        this.renderApp(root)
        return
      }
    }
  }

  private tickDw(root: Root) {
    root._d.dw.sec += 1
    const el = root.querySelector('.omd-dwtime')
    if (el) el.textContent = this.hms(root._d.dw.sec)
  }

  private gainXp(d: any, delta: number) {
    d.xp += delta
    d.totalXp = Math.max(0, d.totalXp + delta)
    while (d.xp >= this.xpForLevel(d.level)) {
      d.xp -= this.xpForLevel(d.level)
      d.level += 1
    }
    while (d.xp < 0 && d.level > 1) {
      d.level -= 1
      d.xp += this.xpForLevel(d.level)
    }
    if (d.xp < 0) d.xp = 0
  }

  private hms(s: number) {
    const m = Math.floor(s / 60),
      h = Math.floor(m / 60)
    return h > 0 ? `${h}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}` : `${m}:${String(s % 60).padStart(2, '0')}`
  }
  private fmtMin(s: number) {
    const m = Math.round(s / 60)
    return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`
  }

  private renderApp(root: Root) {
    const d = root._d
    const nav = root.querySelector('.omd-navbar')
    const content = root.querySelector('.omd-content')
    if (!nav || !content) return

    nav.innerHTML =
      `<div style="padding:5px 9px 14px;display:flex;align-items:center;gap:9px"><svg width="21" height="21" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="17" stroke="#f6f6f4" stroke-width="4.5" stroke-linecap="round" stroke-dasharray="70 36.8" transform="rotate(-90 24 24)"></circle><circle cx="24" cy="24" r="17" stroke="#8b5cf6" stroke-width="4.5" stroke-linecap="round" stroke-dasharray="17 89.8" transform="rotate(66 24 24)"></circle><circle cx="24" cy="24" r="5" fill="#8b5cf6"></circle></svg><span style="font-size:14px;font-weight:600;letter-spacing:-0.01em">One Mission</span></div>` +
      `<div style="display:flex;flex-direction:column;gap:2px">` +
      this.NAV_STARTER.map(([k, l, ic]) => `<div class="omd-nav${d.tab === k ? ' active' : ''}" data-act="nav" data-id="${k}"><i data-lucide="${ic}" width="15" height="15"></i>${l}</div>`).join('') +
      this.NAV_STATIC.map(([l, ic]) => `<div class="omd-nav omd-static"><i data-lucide="${ic}" width="15" height="15"></i>${l}</div>`).join('') +
      `</div>` +
      `<div style="margin-top:auto;display:flex;flex-direction:column;gap:2px;border-top:1px solid rgba(255,255,255,.07);padding-top:10px">` +
      `<div class="omd-nav omd-static"><i data-lucide="user" width="15" height="15"></i>Profil</div>` +
      `<div class="omd-nav omd-static"><i data-lucide="settings" width="15" height="15"></i>Paramètres</div>` +
      `</div>`

    content.innerHTML = this.view(d, d.tab) + this.mqModal(d) + this.nqModal(d)
    this.renderIcons()
  }

  private bar(pct: number, h?: number) {
    return `<div style="height:${h || 5}px;border-radius:99px;background:rgba(255,255,255,.08);overflow:hidden"><div style="width:${pct}%;height:100%;border-radius:99px;background:linear-gradient(90deg,#8b5cf6,#a78bfa);transition:width .5s cubic-bezier(.16,1,.3,1)"></div></div>`
  }
  private head(title: string, right?: string) {
    return `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px"><h2 style="margin:0;font-size:20px;font-weight:600;letter-spacing:-0.01em">${title}</h2>${right || ''}</div>`
  }

  private view(d: any, tab: string): string {
    const xpn = this.xpForLevel(d.level),
      pct = Math.round((d.xp / xpn) * 100)
    if (tab === 'dashboard') {
      const remaining = d.quests.filter((q: any) => !q.done).length
      void remaining
      const prio: Record<string, [string, string, string]> = {
        Sport: ['#8b5cf6', 'Haute', 'dim. 20 juil.'],
        Études: ['#f04444', 'Urgente', 'dim. 20 juil. · 18:00'],
        Admin: ['#62626e', 'Basse', 'dim. 20 juil.'],
        'Bien-être': ['#a78bfa', 'Moyenne', 'dim. 20 juil.'],
        Perso: ['#f5b93d', 'Moyenne', 'dim. 20 juil.'],
      }
      const rows = d.quests
        .map((q: any) => {
          const [dot, plabel, due] = prio[q.cat] || ['#62626e', 'Moyenne', 'dim. 20 juil.']
          return `<div class="omd-row" style="display:flex;align-items:flex-start;gap:12px;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:16px;${q.done ? 'opacity:.6' : ''}"><span class="omd-chk" data-act="qtoggle" data-id="${q.id}" style="margin-top:2px;width:24px;height:24px;flex:none;border-radius:99px;border:2px solid rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;${q.done ? 'background:#8b5cf6;border-color:#8b5cf6' : ''}">${q.done ? "<i data-lucide='check' width='14' height='14' stroke-width='3.5' style='color:#fff'></i>" : ''}</span><div style="min-width:0;flex:1"><p style="margin:0;font-weight:500;${q.done ? 'text-decoration:line-through' : ''}">${q.t}</p><div style="margin-top:8px;display:flex;flex-wrap:wrap;align-items:center;gap:8px;font-size:12px"><span style="display:inline-flex;align-items:center;gap:4px;border-radius:999px;padding:2px 10px;font-weight:500;background:rgba(139,92,246,.14);color:#c4b5fd"><i data-lucide="zap" width="11" height="11" fill="#c4b5fd"></i>${q.xp} XP</span><span style="display:inline-flex;align-items:center;border-radius:999px;padding:2px 10px;font-weight:500;background:${q.col}22;color:${q.col}">${q.cat}</span><span style="display:inline-flex;align-items:center;gap:6px;color:#8f8f98"><span style="width:6px;height:6px;border-radius:999px;background:${dot}"></span>${plabel}</span><span style="display:inline-flex;align-items:center;gap:4px;color:#62626e"><i data-lucide="clock" width="12" height="12"></i>${due}</span></div></div></div>`
        })
        .join('')
      const dwToday = this.fmtMin(d.dw.sec)
      const doneToday = d.quests.filter((q: any) => q.done).length
      const weeklyItems = d.weekly
      const weeklyDone = weeklyItems.filter((w: any) => w.done).length
      const cell = (icon: string, iconCol: string, iconBg: string, label: string, value: string | number) =>
        `<div style="background:#0b0b0f;padding:16px 18px;display:flex;align-items:center;gap:14px"><span style="width:40px;height:40px;flex:none;display:flex;align-items:center;justify-content:center;border-radius:12px;background:${iconBg};color:${iconCol}"><i data-lucide="${icon}" width="20" height="20"></i></span><div style="min-width:0"><p style="margin:0;font-size:12px;color:#8f8f98">${label}</p><p style="margin:2px 0 0;font-size:20px;font-weight:700;letter-spacing:-0.01em">${value}</p></div></div>`
      return `<div><h1 style="margin:0;font-size:24px;font-weight:700;letter-spacing:-0.02em">Salut, <span style="color:#a78bfa">Alex</span> 👋</h1></div>
      <div style="margin-top:24px;display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.07);border-radius:12px;overflow:hidden">
        ${cell('trending-up', '#fff', '#8b5cf6', 'Niveau', d.level)}
        ${cell('flame', '#a78bfa', 'rgba(139,92,246,.14)', "Série d'activité", d.streak + ' j')}
        ${cell('timer', '#a78bfa', 'rgba(139,92,246,.14)', "DeepWork aujourd'hui", dwToday)}
        ${cell('shield-check', '#a78bfa', 'rgba(139,92,246,.14)', 'Sans addiction', d.addictionDays + ' j')}
      </div>
      <div style="margin-top:24px;display:grid;grid-template-columns:2fr 1fr;gap:16px;align-items:start">
        <div style="display:flex;flex-direction:column;gap:16px;min-width:0">
          <div style="position:relative;overflow:hidden;border:1px solid rgba(139,92,246,.3);border-radius:16px;padding:20px;background:linear-gradient(135deg,rgba(139,92,246,.14),transparent 55%)">
            <div style="position:absolute;top:-64px;right:-64px;width:200px;height:200px;border-radius:999px;opacity:.2;filter:blur(60px);background:#8b5cf6"></div>
            <div style="position:relative;display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
              <div style="min-width:0"><p style="margin:0;display:flex;align-items:center;gap:6px;font-size:10px;font-weight:700;letter-spacing:.14em;color:#a78bfa;text-transform:uppercase"><i data-lucide="crosshair" width="12" height="12"></i>Quête principale</p><h2 style="margin:8px 0 0;font-size:17px;font-weight:700;letter-spacing:-0.01em">${d.mainQuest.t}</h2><p style="margin:4px 0 0;font-size:12px;color:#8f8f98">Objectif : ${d.mainQuest.date}</p></div>
              <div style="display:flex;gap:4px;flex:none"><span class="omd-btn" data-act="mqopen" style="padding:7px;border-radius:8px;color:#8f8f98;display:inline-flex"><i data-lucide="pencil" width="15" height="15"></i></span><span class="omd-btn" data-act="nav" data-id="objectives" style="padding:7px;border-radius:8px;color:#8f8f98;display:inline-flex"><i data-lucide="trash-2" width="15" height="15"></i></span></div>
            </div>
            <div style="position:relative;margin-top:18px;display:flex;align-items:center;gap:12px"><div style="flex:1">${this.bar(d.mainQuest.pct, 9)}</div><span style="font-family:'Geist Mono',monospace;font-size:13px;font-weight:700;color:#a78bfa">${d.mainQuest.pct}%</span></div>
          </div>
          <div style="border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:20px"><div style="display:flex;align-items:center;justify-content:space-between"><h2 style="margin:0;display:flex;align-items:center;gap:8px;font-size:16px;font-weight:600"><i data-lucide="swords" width="17" height="17" style="color:#a78bfa"></i>Quêtes du jour</h2><span style="display:flex;align-items:center;gap:4px;font-size:12px;font-weight:500;color:#a78bfa">Tout voir <i data-lucide="arrow-right" width="13" height="13"></i></span></div><div style="margin-top:16px;display:flex;flex-direction:column;gap:8px">${rows}</div></div>
          <div style="border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:20px"><div style="display:flex;align-items:center;justify-content:space-between"><h2 style="margin:0;font-size:16px;font-weight:600">Cette semaine</h2><span style="display:flex;align-items:center;gap:4px;font-size:12px;font-weight:500;color:#a78bfa">Gérer <i data-lucide="arrow-right" width="13" height="13"></i></span></div><div style="margin-top:12px;display:flex;align-items:center;gap:12px"><div style="flex:1">${this.bar(Math.round((weeklyDone / weeklyItems.length) * 100), 6)}</div><span style="font-size:12px;color:#8f8f98">${weeklyDone}/${weeklyItems.length}</span></div><ul style="list-style:none;margin:12px 0 0;padding:0;display:flex;flex-direction:column;gap:6px;font-size:14px">${weeklyItems.map((w: any, i: number) => `<li class="omd-row" style="display:flex;align-items:center;gap:10px;border-radius:12px;padding:6px 8px"><span class="omd-chk" data-act="wtoggle" data-id="${i}" style="width:20px;height:20px;flex:none;display:flex;align-items:center;justify-content:center;border-radius:99px;${w.done ? 'background:#8b5cf6' : 'border:2px solid rgba(255,255,255,.14)'}">${w.done ? "<i data-lucide='check' width='12' height='12' stroke-width='3.5' style='color:#fff'></i>" : ''}</span><span style="${w.done ? 'color:#8f8f98;text-decoration:line-through' : ''}">${w.t}</span></li>`).join('')}</ul></div>
        </div>
        <div style="display:flex;flex-direction:column;gap:16px;min-width:0">
          <div style="border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:20px"><h2 style="margin:0;font-size:14px;font-weight:600">Progression</h2><p style="margin:12px 0 0;display:flex;align-items:baseline;gap:8px"><span style="font-size:36px;font-weight:900;color:#a78bfa">${d.level}</span><span style="font-size:14px;color:#8f8f98">niveau</span></p><div style="margin-top:12px">${this.bar(pct, 10)}</div><p style="margin:8px 0 0;font-size:12px;color:#8f8f98">${d.xp}/${xpn} XP — encore <span style="font-weight:600;color:#f6f6f4">${xpn - d.xp} XP</span> avant le niveau ${d.level + 1}</p><p style="margin:12px 0 0;border-top:1px solid rgba(255,255,255,.07);padding-top:12px;font-size:12px;color:#62626e">XP totale : <span style="font-weight:600;color:#8f8f98">${d.totalXp.toLocaleString('fr-FR')}</span></p></div>
          <div style="position:relative;overflow:hidden;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:20px"><i data-lucide="quote" width="44" height="44" style="position:absolute;top:-4px;right:-4px;transform:rotate(12deg);color:#8b5cf6;opacity:.15"></i><h2 style="margin:0;font-size:14px;font-weight:600">Citation du jour</h2><p style="margin:12px 0 0;font-size:14px;line-height:1.6;font-style:italic">« La discipline est le pont entre les objectifs et l'accomplissement. »</p><p style="margin:8px 0 0;font-size:12px;font-weight:500;color:#a78bfa">— Jim Rohn</p></div>
          <div style="border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:20px"><h2 style="margin:0;font-size:14px;font-weight:600">Résumé du jour</h2><ul style="list-style:none;margin:12px 0 0;padding:0;display:flex;flex-direction:column;gap:10px;font-size:14px"><li style="display:flex;align-items:center;justify-content:space-between"><span style="color:#8f8f98">Quêtes terminées</span><span style="font-weight:600">${doneToday}</span></li><li style="display:flex;align-items:center;justify-content:space-between"><span style="color:#8f8f98">DeepWork</span><span style="font-weight:600">${dwToday}</span></li><li style="display:flex;align-items:center;justify-content:space-between"><span style="color:#8f8f98">Hebdo cette semaine</span><span style="font-weight:600">${weeklyDone}/${weeklyItems.length}</span></li><li style="display:flex;align-items:center;justify-content:space-between"><span style="color:#8f8f98">Journal</span><span style="display:flex;align-items:center;gap:4px;font-weight:500;color:#a78bfa"><i data-lucide="book-open-text" width="13" height="13"></i>À écrire</span></li></ul></div>
        </div>
      </div>`
    }
    if (tab === 'quests') {
      const rows = d.quests
        .map(
          (q: any) =>
            `<div class="omd-row" style="display:flex;align-items:center;gap:14px;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:14px 16px;${q.done ? 'opacity:.5' : ''}"><span class="omd-chk" data-act="qtoggle" data-id="${q.id}" style="width:22px;height:22px;flex:none;border-radius:99px;border:2px solid rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;${q.done ? 'background:#8b5cf6;border-color:#8b5cf6' : ''}">${q.done ? "<i data-lucide='check' width='12' height='12' stroke-width='3' style='color:#fff'></i>" : ''}</span><span style="width:8px;height:8px;flex:none;border-radius:99px;background:${q.col}"></span><span style="flex:1;font-size:14px;${q.done ? 'text-decoration:line-through' : ''}">${q.t}</span><span style="font-size:11.5px;color:#8f8f98">${q.cat}</span><span style="display:inline-flex;align-items:center;gap:4px;border-radius:99px;padding:3px 10px;font-size:11.5px;font-weight:700;background:rgba(139,92,246,.16);color:#c4b5fd"><i data-lucide="zap" width="11" height="11" fill="#c4b5fd"></i>${q.xp}</span><i class="omd-x" data-act="qdel" data-id="${q.id}" data-lucide="trash-2" width="15" height="15"></i></div>`,
        )
        .join('')
      return `<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px"><div><h1 style="margin:0;font-size:22px;font-weight:700;letter-spacing:-0.02em">Quêtes</h1><p style="margin:5px 0 0;font-size:13px;color:#8f8f98">Chaque quête terminée te rapporte de l'expérience.</p></div><div style="display:flex;gap:10px;flex:none"><span class="omd-btn" style="height:36px;display:inline-flex;align-items:center;gap:7px;padding:0 15px;border-radius:9px;border:1px solid rgba(255,255,255,.12);color:#f6f6f4;font-size:13px;font-weight:600"><i data-lucide="sliders-horizontal" width="14" height="14"></i>Gérer les catégories</span><span class="omd-btn" data-act="nqopen" style="height:36px;display:inline-flex;align-items:center;gap:7px;padding:0 15px;border-radius:9px;background:#8b5cf6;color:#fff;font-size:13px;font-weight:600"><i data-lucide="plus" width="14" height="14"></i>Nouvelle quête</span></div></div>
        <div style="margin-top:20px;position:relative;overflow:hidden;border:1px solid rgba(139,92,246,.3);border-radius:16px;padding:22px 24px;background:linear-gradient(135deg,rgba(139,92,246,.18),transparent 60%)"><div style="position:absolute;top:-64px;right:-64px;width:200px;height:200px;border-radius:999px;opacity:.2;filter:blur(60px);background:#8b5cf6"></div><div style="position:relative;display:flex;align-items:flex-start;justify-content:space-between;gap:12px"><div><p style="margin:0;display:flex;align-items:center;gap:6px;font-size:11px;font-weight:700;letter-spacing:.14em;color:#c4b5fd;text-transform:uppercase"><i data-lucide="crosshair" width="12" height="12"></i>Quête principale</p><h2 style="margin:10px 0 0;font-size:26px;font-weight:800;letter-spacing:-0.02em">${d.mainQuest.t}</h2><p style="margin:6px 0 0;font-size:12px;color:#8f8f98">Objectif : ${d.mainQuest.date}</p></div><div style="display:flex;gap:4px;flex:none"><span class="omd-btn" data-act="mqopen" style="padding:7px;border-radius:8px;color:#8f8f98;display:inline-flex"><i data-lucide="pencil" width="15" height="15"></i></span><span class="omd-btn" data-act="nav" data-id="objectives" style="padding:7px;border-radius:8px;color:#8f8f98;display:inline-flex"><i data-lucide="trash-2" width="15" height="15"></i></span></div></div><div style="position:relative;margin-top:18px;display:flex;align-items:center;gap:12px"><div style="flex:1">${this.bar(d.mainQuest.pct, 8)}</div><span style="font-family:'Geist Mono',monospace;font-size:13px;font-weight:700;color:#a78bfa">${d.mainQuest.pct}%</span></div></div>
        <div style="margin-top:24px;display:flex;align-items:center;justify-content:space-between"><h2 style="margin:0;font-size:16px;font-weight:600">Mes quêtes</h2><span class="omd-btn" style="height:32px;display:inline-flex;align-items:center;gap:6px;padding:0 13px;border-radius:8px;border:1px solid rgba(255,255,255,.12);color:#8f8f98;font-size:12.5px;font-weight:500"><i data-lucide="filter" width="13" height="13"></i>Catégories <i data-lucide="chevron-down" width="13" height="13"></i></span></div>
        <div style="margin-top:14px;display:flex;gap:10px"><input class="omd-input omd-qnew" data-enter="qadd" placeholder="Créer une quête (+50 XP)…" style="flex:1"><span class="omd-btn" data-act="qadd" style="height:34px;display:inline-flex;align-items:center;gap:6px;padding:0 16px;border-radius:8px;background:#8b5cf6;color:#fff;font-size:13px;font-weight:600"><i data-lucide="plus" width="14" height="14"></i>Créer</span></div>
        <p style="margin:20px 0 0;font-family:'Geist Mono',monospace;font-size:11px;letter-spacing:.06em;color:#62626e;text-transform:uppercase">Aujourd'hui · ${d.quests.filter((q: any) => !q.done).length || d.quests.length}</p>
        <div style="margin-top:12px;display:flex;flex-direction:column;gap:10px">${rows || '<div style="border:1px dashed rgba(255,255,255,.14);border-radius:16px;padding:40px 20px;text-align:center"><span style="display:inline-flex;width:44px;height:44px;align-items:center;justify-content:center;border-radius:99px;background:rgba(139,92,246,.14);color:#a78bfa"><i data-lucide="swords" width="22" height="22"></i></span><p style="margin:14px 0 0;font-size:15px;font-weight:700">Aucune quête pour l\'instant</p><p style="margin:4px 0 0;font-size:13px;color:#8f8f98">Crée ta première quête et commence à gagner de l\'XP.</p></div>'}</div>`
    }
    if (tab === 'objectives') {
      const rows = d.objectives
        .map(
          (o: any, i: number) =>
            `<div style="border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:18px"><div style="display:flex;align-items:center;justify-content:space-between;gap:14px"><span style="font-size:15px;font-weight:600">${o.t}</span><span style="font-family:'Geist Mono',monospace;font-size:14px;color:#a78bfa">${o.pct}%</span></div><div style="margin-top:14px">${this.bar(o.pct, 7)}</div><div style="margin-top:14px;display:flex;gap:8px"><span class="omd-btn" data-act="odec" data-id="${i}" style="height:30px;display:inline-flex;align-items:center;gap:5px;padding:0 12px;border-radius:8px;border:1px solid rgba(255,255,255,.12);font-size:12.5px;font-weight:600"><i data-lucide="minus" width="13" height="13"></i>5%</span><span class="omd-btn" data-act="oinc" data-id="${i}" style="height:30px;display:inline-flex;align-items:center;gap:5px;padding:0 12px;border-radius:8px;background:#8b5cf6;color:#fff;font-size:12.5px;font-weight:600"><i data-lucide="plus" width="13" height="13"></i>5%</span></div></div>`,
        )
        .join('')
      return this.head('Objectifs') + `<div style="display:flex;flex-direction:column;gap:14px">${rows}</div>`
    }
    if (tab === 'habits') {
      const done = d.habits.filter((h: any) => h.done).length
      const rows = d.habits
        .map(
          (h: any, i: number) =>
            `<div class="omd-row" style="display:flex;align-items:center;gap:14px;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:14px 16px"><span class="omd-chk" data-act="htoggle" data-id="${i}" style="width:22px;height:22px;flex:none;border-radius:7px;border:2px solid rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;${h.done ? 'background:#22c55e;border-color:#22c55e' : ''}">${h.done ? "<i data-lucide='check' width='12' height='12' stroke-width='3' style='color:#fff'></i>" : ''}</span><span style="flex:1;font-size:14px;${h.done ? 'color:#8f8f98' : ''}">${h.t}</span></div>`,
        )
        .join('')
      return (
        this.head('Habitudes', `<span style="font-family:'Geist Mono',monospace;font-size:12px;color:#8f8f98">${done}/${d.habits.length} aujourd'hui</span>`) +
        `<div style="margin-bottom:16px">${this.bar(Math.round((done / d.habits.length) * 100), 7)}</div>
        <div style="display:flex;flex-direction:column;gap:10px">${rows}</div>`
      )
    }
    if (tab === 'routines') {
      const all = [...d.routines.Matin, ...d.routines.Soir]
      const totalCells = all.length * 7,
        doneCells = all.reduce((s: number, x: any) => s + x.days.reduce((a: number, b: number) => a + b, 0), 0)
      const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
      const rstat = (icon: string, label: string, value: string) =>
        `<div style="background:#0b0b0f;padding:16px 18px;display:flex;align-items:center;gap:14px"><span style="width:40px;height:40px;flex:none;display:flex;align-items:center;justify-content:center;border-radius:12px;background:rgba(139,92,246,.14);color:#a78bfa"><i data-lucide="${icon}" width="20" height="20"></i></span><div><p style="margin:0;font-size:12px;color:#8f8f98">${label}</p><p style="margin:2px 0 0;font-size:20px;font-weight:700">${value}</p></div></div>`
      const sec = (name: string, key: string, icon: string) =>
        `<div style="border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:20px"><h3 style="margin:0 0 6px;display:flex;align-items:center;gap:8px;font-size:15px;font-weight:600"><i data-lucide="${icon}" width="17" height="17" style="color:#a78bfa"></i>${name}</h3><div style="display:grid;grid-template-columns:1fr repeat(7,34px);gap:6px 8px;align-items:center"><div></div>${days.map((dy) => `<div style="text-align:center;font-size:11px;color:#8f8f98">${dy}</div>`).join('')}${d.routines[key]
          .map(
            (it: any, i: number) =>
              `<div class="omd-row" style="display:flex;align-items:center;gap:10px;font-size:13.5px"><i data-lucide="grip-vertical" width="14" height="14" style="color:#55555e"></i>${it.t}</div>${it.days
                .map(
                  (on: number, di: number) =>
                    `<div style="display:flex;justify-content:center"><span class="omd-chk" data-act="rtoggle" data-id="${key}:${i}:${di}" style="width:24px;height:24px;border-radius:99px;display:flex;align-items:center;justify-content:center;${on ? 'background:#8b5cf6' : 'border:1.5px solid rgba(255,255,255,.16)'}">${on ? "<i data-lucide='check' width='13' height='13' stroke-width='3' style='color:#fff'></i>" : ''}</span></div>`,
                )
                .join('')}`,
          )
          .join('')}</div><span class="omd-btn" style="margin-top:14px;display:inline-flex;align-items:center;gap:6px;color:#a78bfa;font-size:13px;font-weight:500"><i data-lucide="plus" width="14" height="14"></i>Ajouter une tâche</span></div>`
      return `<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px"><div><h1 style="margin:0;font-size:22px;font-weight:700;letter-spacing:-0.02em">Routine</h1><p style="margin:5px 0 0;font-size:13px;color:#8f8f98">Semaine du 20 au 26 juillet</p></div><span class="omd-btn" style="height:36px;display:inline-flex;align-items:center;gap:7px;padding:0 15px;border-radius:9px;border:1px solid rgba(255,255,255,.12);color:#f6f6f4;font-size:13px;font-weight:600;flex:none"><i data-lucide="rotate-ccw" width="14" height="14"></i>Réinitialiser cette semaine</span></div>
      <div style="margin-top:20px;display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.07);border-radius:12px;overflow:hidden">${rstat('trending-up', 'Progression de la semaine', Math.round((doneCells / totalCells) * 100) + ' %')}${rstat('check-square', 'Tâches réalisées', doneCells + ' / ' + totalCells)}${rstat('flame', 'Série actuelle', '0 semaine')}</div>
      <div style="margin-top:20px;display:flex;flex-direction:column;gap:16px">${sec('Morning Routine', 'Matin', 'sunrise')}${sec('Night Routine', 'Soir', 'moon')}</div>`
    }
    if (tab === 'deepwork') {
      const r = d.dw
      const frac = (r.sec % 1500) / 1500,
        circ = 2 * Math.PI * 120,
        off = circ * (1 - frac)
      const dwstat = (label: string, value: string) =>
        `<div style="background:#0b0b0f;padding:16px 18px"><p style="margin:0;font-size:10.5px;font-weight:600;letter-spacing:.06em;color:#8f8f98;text-transform:uppercase">${label}</p><p style="margin:7px 0 0;font-size:20px;font-weight:700">${value}</p></div>`
      return `<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px"><div><h1 style="margin:0;font-size:22px;font-weight:700;letter-spacing:-0.02em">DeepWork</h1><p style="margin:5px 0 0;font-size:13px;color:#8f8f98">Sessions de focus profond, façon Pomodoro : 25 min de focus, pauses automatiques.</p></div><span class="omd-btn" style="height:36px;display:inline-flex;align-items:center;gap:7px;padding:0 15px;border-radius:9px;border:1px solid rgba(255,255,255,.12);color:#f6f6f4;font-size:13px;font-weight:600;flex:none"><i data-lucide="sliders-horizontal" width="14" height="14"></i>Réglages</span></div>
      <div style="margin-top:20px;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:40px 20px;display:flex;flex-direction:column;align-items:center">
        <div style="position:relative;width:280px;height:280px;display:flex;align-items:center;justify-content:center"><svg width="280" height="280" viewBox="0 0 280 280" style="position:absolute;inset:0"><circle cx="140" cy="140" r="120" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="6"></circle><circle cx="140" cy="140" r="120" fill="none" stroke="#8b5cf6" stroke-width="6" stroke-linecap="round" stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 140 140)" style="transition:stroke-dashoffset .5s linear"></circle></svg><div style="text-align:center"><p style="margin:0;font-size:12px;font-weight:700;letter-spacing:.2em;color:#a78bfa">FOCUS</p><p class="omd-dwtime" style="margin:8px 0 0;font-family:'Geist Mono',monospace;font-size:52px;font-weight:600;letter-spacing:-0.01em;line-height:1">${this.hms(r.sec)}</p></div></div>
        <div style="margin-top:20px;display:flex;gap:5px">${[0, 1, 2, 3].map((i) => `<span style="width:7px;height:7px;border-radius:99px;background:${i === 0 ? '#8b5cf6' : 'rgba(255,255,255,.15)'}"></span>`).join('')}</div>
        <div style="margin-top:24px;display:flex;align-items:center;gap:14px"><span class="omd-btn" data-act="dwstop" style="width:40px;height:40px;display:inline-flex;align-items:center;justify-content:center;border-radius:99px;color:#8f8f98"><i data-lucide="rotate-ccw" width="17" height="17"></i></span>${r.running ? `<span class="omd-btn" data-act="dwpause" style="height:48px;display:inline-flex;align-items:center;gap:8px;padding:0 28px;border-radius:12px;background:#8b5cf6;color:#fff;font-size:15px;font-weight:600"><i data-lucide="pause" width="17" height="17"></i>Pause</span>` : `<span class="omd-btn" data-act="dwstart" style="height:48px;display:inline-flex;align-items:center;gap:8px;padding:0 28px;border-radius:12px;background:#8b5cf6;color:#fff;font-size:15px;font-weight:600"><i data-lucide="play" width="17" height="17" fill="#fff"></i>Démarrer</span>`}<span class="omd-btn" style="width:40px;height:40px;display:inline-flex;align-items:center;justify-content:center;border-radius:99px;color:#8f8f98"><i data-lucide="skip-forward" width="17" height="17"></i></span></div>
      </div>
      <div style="margin-top:16px;display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.07);border-radius:12px;overflow:hidden">${dwstat("Aujourd'hui", this.fmtMin(r.sec))}${dwstat('Cette semaine', '4 h 10')}${dwstat('Ce mois-ci', '18 h 30')}${dwstat('Au total', '72 h')}</div>
      <div style="margin-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <div style="border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:20px"><h2 style="margin:0;font-size:14px;font-weight:600">Focus des 7 derniers jours</h2><div style="margin-top:18px;display:flex;align-items:flex-end;gap:8px;height:80px">${[40, 65, 30, 80, 55, 45, 90].map((h, i) => `<div style="flex:1;height:${h}%;border-radius:4px;background:${i === 6 ? '#8b5cf6' : 'rgba(139,92,246,.35)'}"></div>`).join('')}</div></div>
        <div style="border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:20px"><h2 style="margin:0;font-size:14px;font-weight:600">Sessions récentes</h2><div style="margin-top:14px;display:flex;flex-direction:column;gap:10px;font-size:13px">${[
          ["Aujourd'hui · 09:12", '25 min'],
          ['Hier · 14:40', '25 min'],
          ['Hier · 10:05', '50 min'],
        ]
          .map(([w, t]) => `<div style="display:flex;align-items:center;justify-content:space-between"><span style="color:#8f8f98">${w}</span><span style="font-weight:600">${t}</span></div>`)
          .join('')}</div></div>
      </div>`
    }
    if (tab === 'addictions') {
      return `<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px"><div><h1 style="margin:0;font-size:22px;font-weight:700;letter-spacing:-0.02em">Addictions</h1><p style="margin:5px 0 0;font-size:13px;color:#8f8f98">Chaque jour sans craquer allonge ta série. La rechute fait partie du chemin : on la note, on comprend, on repart.</p></div><span class="omd-btn" data-act="addplus" style="height:36px;display:inline-flex;align-items:center;gap:7px;padding:0 15px;border-radius:9px;background:#8b5cf6;color:#fff;font-size:13px;font-weight:600;flex:none"><i data-lucide="plus" width="14" height="14"></i>Nouvelle addiction</span></div>
      <div style="margin-top:20px;max-width:460px;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:22px">
        <div style="display:flex;align-items:center;gap:12px"><span style="width:44px;height:44px;flex:none;display:flex;align-items:center;justify-content:center;border-radius:12px;background:rgba(139,92,246,.14);color:#a78bfa"><i data-lucide="shield-check" width="22" height="22"></i></span><div><p style="margin:0;font-size:15px;font-weight:700">réseaux sociaux</p><p style="margin:2px 0 0;font-size:12px;color:#8f8f98">depuis le 21 juillet 2026</p></div></div>
        <p style="margin:18px 0 0;display:flex;align-items:baseline;gap:8px"><span style="font-size:44px;font-weight:800;color:#a78bfa;line-height:1">${d.addictionDays}</span><span style="font-size:14px;color:#8f8f98">jour${d.addictionDays > 1 ? 's' : ''} sans craquer</span></p>
        <div style="margin-top:14px;display:flex;gap:8px"><span style="display:inline-flex;align-items:center;gap:5px;border-radius:99px;padding:3px 11px;font-size:11.5px;font-weight:600;background:rgba(255,255,255,.05);color:#8f8f98"><i data-lucide="trophy" width="12" height="12"></i>record : ${d.addictionRecord} j</span><span style="display:inline-flex;align-items:center;gap:5px;border-radius:99px;padding:3px 11px;font-size:11.5px;font-weight:600;background:rgba(139,92,246,.14);color:#c4b5fd"><i data-lucide="flame" width="12" height="12"></i>prochain palier : ${d.addictionDays < 1 ? '1' : d.addictionDays < 7 ? '7' : d.addictionDays < 30 ? '30' : '60'} j</span></div>
        <div style="margin-top:18px;border-top:1px solid rgba(255,255,255,.07);padding-top:16px;display:flex;gap:10px"><span class="omd-btn" style="flex:1;height:40px;display:inline-flex;align-items:center;justify-content:center;gap:7px;border-radius:10px;background:#8b5cf6;color:#fff;font-size:13.5px;font-weight:600"><i data-lucide="message-circle" width="15" height="15"></i>Coach IA</span><span class="omd-btn" data-act="addreset" style="flex:1;height:40px;display:inline-flex;align-items:center;justify-content:center;border-radius:10px;border:1px solid rgba(255,255,255,.12);color:#f6f6f4;font-size:13.5px;font-weight:600">J'ai rechuté</span></div>
      </div>`
    }
    if (tab === 'planning') {
      const days = this.PDAYS,
        hours = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]
      const allEvs = days.flatMap(([dy]) => d.planning[dy])
      let planned = 0,
        doneMin = 0
      const catMin: Record<string, number> = {}
      allEvs.forEach((e: any) => {
        const dur = Math.max(0, this.minsOf(e.end) - this.minsOf(e.ti))
        planned += dur
        if (e.done) doneMin += dur
        catMin[e.cat] = (catMin[e.cat] || 0) + dur
      })
      const doneCount = allEvs.filter((e: any) => e.done).length
      const respect = allEvs.length ? Math.round((doneCount / allEvs.length) * 100) : 0
      const topCat = Object.keys(catMin).sort((a, b) => catMin[b] - catMin[a])[0] || '—'
      const fmtH = (m: number) => {
        const h = Math.floor(m / 60),
          mm = m % 60
        return h + ' h' + (mm ? ' ' + String(mm).padStart(2, '0') : ' 00')
      }
      const pstat = (label: string, value: string, sub?: string) =>
        `<div style="background:#0b0b0f;padding:16px 18px"><p style="margin:0;font-size:11px;color:#8f8f98">${label}</p><p style="margin:7px 0 0;font-size:20px;font-weight:700">${value}</p>${sub ? `<p style="margin:5px 0 0;font-size:11px;color:#62626e">${sub}</p>` : ''}</div>`
      const pills = this.CATS.slice(1)
        .map(([n, c]) => `<span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:#c9c9d0"><span style="width:9px;height:9px;border-radius:99px;background:${c}"></span>${n}</span>`)
        .join('')
      const header = days.map(([dy, n]) => `<div style="padding:10px 6px;text-align:center;border-left:1px solid rgba(255,255,255,.06)"><p style="margin:0;font-size:11px;color:#8f8f98">${dy}.</p><p style="margin:3px 0 0;font-size:14px;font-weight:600;${n === 21 ? 'color:#fff' : ''}">${n === 21 ? `<span style="display:inline-flex;width:26px;height:26px;align-items:center;justify-content:center;border-radius:99px;background:#8b5cf6;color:#fff">${n}</span>` : n}</p></div>`).join('')
      const grid = hours
        .map(
          (h) =>
            `<div style="display:grid;grid-template-columns:56px repeat(7,1fr);border-top:1px solid rgba(255,255,255,.06)"><div style="padding:6px 8px;font-family:'Geist Mono',monospace;font-size:10px;color:#55555e">${String(h).padStart(2, '0')}h00</div>${days
              .map(([dy]) => {
                const evs = d.planning[dy].filter((e: any) => parseInt(e.ti) === h)
                return `<div style="min-height:46px;border-left:1px solid rgba(255,255,255,.06);padding:3px;display:flex;gap:3px">${evs
                  .map((e: any) => {
                    const idx = d.planning[dy].indexOf(e)
                    const col = this.catColor(e.cat)
                    return `<div class="omd-row omd-btn" data-act="pedit" data-id="${dy}:${idx}" title="Modifier" style="flex:1;min-width:0;cursor:pointer;background:${col}22;border-left:2px solid ${col};border-radius:6px;padding:4px 6px;font-size:10.5px;line-height:1.25;color:#f6f6f4;${e.done ? 'opacity:.6' : ''}"><span style="font-family:'Geist Mono',monospace;color:${col};font-size:9.5px">${e.ti}</span><div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e.t}</div><div style="color:#8f8f98;font-size:9px">${this.fmtDur(e.ti, e.end)}</div></div>`
                  })
                  .join('')}</div>`
              })
              .join('')}</div>`,
        )
        .join('')
      return `<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px"><div><h1 style="margin:0;font-size:22px;font-weight:700;letter-spacing:-0.02em">Planning</h1><p style="margin:5px 0 0;font-size:13px;color:#8f8f98">Organise tes semaines heure par heure et suis ce que tu accomplis vraiment.</p></div><div style="display:flex;gap:10px;flex:none"><span class="omd-btn" style="height:36px;display:inline-flex;align-items:center;gap:7px;padding:0 15px;border-radius:9px;border:1px solid rgba(255,255,255,.12);color:#f6f6f4;font-size:13px;font-weight:600"><i data-lucide="sliders-horizontal" width="14" height="14"></i>Gérer les catégories</span><span class="omd-btn" data-act="pnew" style="height:36px;display:inline-flex;align-items:center;gap:7px;padding:0 15px;border-radius:9px;background:#8b5cf6;color:#fff;font-size:13px;font-weight:600"><i data-lucide="plus" width="14" height="14"></i>Nouvel événement</span></div></div>
      <div style="margin-top:20px;display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.07);border-radius:12px;overflow:hidden">${pstat('Heures planifiées', fmtH(planned))}${pstat('Heures effectuées', fmtH(doneMin))}${pstat('Respect du planning', respect + ' %', doneCount + '/' + allEvs.length + ' événements effectués')}${pstat('Par catégorie', topCat, 'catégorie la plus planifiée')}</div>
      <div style="margin-top:16px;display:flex;flex-wrap:wrap;align-items:center;gap:16px"><span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:#8f8f98"><i data-lucide="filter" width="13" height="13"></i>Afficher :</span>${pills}</div>
      <div style="margin-top:16px;display:flex;align-items:center;justify-content:space-between"><div style="display:flex;align-items:center;gap:10px"><span class="omd-btn" style="width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;border-radius:8px;border:1px solid rgba(255,255,255,.12);color:#8f8f98"><i data-lucide="chevron-left" width="15" height="15"></i></span><span style="font-size:13px;font-weight:600">20 au 26 juillet</span><span class="omd-btn" style="width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;border-radius:8px;border:1px solid rgba(255,255,255,.12);color:#8f8f98"><i data-lucide="chevron-right" width="15" height="15"></i></span></div><div style="display:flex;gap:3px;border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:3px"><span style="border-radius:6px;padding:4px 12px;font-size:12px;font-weight:600;background:#8b5cf6;color:#fff">1 h</span><span style="border-radius:6px;padding:4px 12px;font-size:12px;font-weight:500;color:#8f8f98">30 min</span></div></div>
      <div style="margin-top:14px;border:1px solid rgba(255,255,255,.08);border-radius:14px;overflow:hidden"><div style="display:grid;grid-template-columns:56px repeat(7,1fr);background:rgba(255,255,255,.02)"><div></div>${header}</div>${grid}</div>
      ${this.planningModal(d)}${this.confirmModal(d)}`
    }
    if (tab === 'weekly') {
      const done = d.weekly.filter((w: any) => w.done).length
      const rows = d.weekly
        .map(
          (w: any, i: number) =>
            `<div class="omd-row" style="display:flex;align-items:center;gap:14px;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:16px 18px;${w.done ? 'opacity:.55' : ''}"><i data-lucide="grip-vertical" width="16" height="16" style="color:#55555e;flex:none"></i><span class="omd-chk" data-act="wtoggle" data-id="${i}" style="width:24px;height:24px;flex:none;border-radius:99px;border:2px solid rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;${w.done ? 'background:#8b5cf6;border-color:#8b5cf6' : ''}">${w.done ? "<i data-lucide='check' width='14' height='14' stroke-width='3.5' style='color:#fff'></i>" : ''}</span><span style="flex:1;font-size:14px;font-weight:600;${w.done ? 'text-decoration:line-through' : ''}">${w.t}</span>${w.done ? '<i class="omd-x" data-lucide="pencil" width="15" height="15" style="color:#55555e;cursor:pointer"></i><i class="omd-x" data-lucide="trash-2" width="15" height="15"></i>' : ''}<span style="display:inline-flex;align-items:center;gap:4px;border-radius:99px;padding:3px 11px;font-size:11.5px;font-weight:700;background:rgba(139,92,246,.16);color:#c4b5fd"><i data-lucide="zap" width="11" height="11" fill="#c4b5fd"></i>${w.xp} XP</span></div>`,
        )
        .join('')
      return `<h1 style="margin:0;font-size:22px;font-weight:700;letter-spacing:-0.02em">Quêtes hebdomadaires</h1><p style="margin:5px 0 0;display:flex;align-items:center;gap:6px;font-size:13px;color:#8f8f98"><i data-lucide="rotate-ccw" width="13" height="13"></i>Permanentes — réinitialise-les quand tu démarres une nouvelle semaine.</p>
      <div style="margin-top:18px;display:flex;gap:10px"><span class="omd-btn" style="height:40px;display:inline-flex;align-items:center;gap:8px;padding:0 18px;border-radius:10px;border:1px solid rgba(255,255,255,.12);color:#f6f6f4;font-size:13.5px;font-weight:600"><i data-lucide="rotate-ccw" width="15" height="15"></i>Nouvelle semaine</span><span class="omd-btn" style="height:40px;display:inline-flex;align-items:center;gap:8px;padding:0 18px;border-radius:10px;background:#8b5cf6;color:#fff;font-size:13.5px;font-weight:600"><i data-lucide="plus" width="15" height="15"></i>Nouvelle quête hebdo</span></div>
      <div style="margin-top:18px;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:18px"><div style="display:flex;align-items:center;justify-content:space-between;font-size:14px"><span style="font-weight:600">Cette semaine</span><span style="color:#8f8f98"><span style="font-weight:700;color:#a78bfa">${done}</span>/${d.weekly.length} terminées</span></div><div style="margin-top:12px">${this.bar(Math.round((done / d.weekly.length) * 100), 8)}</div></div>
      <div style="margin-top:14px;display:flex;flex-direction:column;gap:10px">${rows}</div>`
    }
    if (tab === 'journal') {
      const e = d.journal[d.journalSel]
      const list = d.journal
        .map(
          (j: any, i: number) =>
            `<button class="omd-btn" data-act="jsel" data-id="${i}" style="display:flex;align-items:center;justify-content:space-between;gap:8px;border:none;border-radius:12px;padding:9px 10px;text-align:left;font-size:13px;background:${i === d.journalSel ? 'rgba(139,92,246,.14)' : 'transparent'};color:${i === d.journalSel ? '#c4b5fd' : '#8f8f98'};font-weight:${i === d.journalSel ? '600' : '400'};text-transform:capitalize;width:100%">${j.d}${j.score != null ? `<span style="font-weight:700">${j.score}/10</span>` : i === 0 ? '<span style="border-radius:99px;padding:1px 8px;font-size:10.5px;font-weight:700;background:rgba(139,92,246,.16);color:#c4b5fd">à écrire</span>' : ''}</button>`,
        )
        .join('')
      void list
      const analysis =
        e.written && e.score != null
          ? `<div style="border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:20px"><div style="display:flex;align-items:center;justify-content:space-between"><h2 style="margin:0;display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600"><i data-lucide="sparkles" width="15" height="15" style="color:#a78bfa"></i>Analyse du coach</h2><p style="margin:0;display:flex;align-items:baseline;gap:3px"><span style="font-size:24px;font-weight:900;color:#a78bfa">${e.score}</span><span style="font-size:12px;color:#8f8f98">/10</span></p></div><p style="margin:12px 0 0;font-size:13.5px;line-height:1.6;font-style:italic">« ${e.txt} »</p><div style="margin-top:16px;display:flex;flex-direction:column;gap:12px">${(
              [
                ['Points forts', e.pos, '#22c55e', 'thumbs-up'],
                ['À améliorer', e.imp, '#a78bfa', 'trending-up'],
                ['Conseils pour demain', e.adv, '#8f8f98', 'lightbulb'],
              ] as [string, string[], string, string][]
            )
              .map(
                ([t, items, col, ic]) =>
                  `<div><p style="margin:0;display:flex;align-items:center;gap:6px;font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:${col}"><i data-lucide="${ic}" width="12" height="12"></i>${t}</p><ul style="list-style:none;margin:8px 0 0;padding:0;display:flex;flex-direction:column;gap:6px;font-size:13px">${items.map((x) => `<li style="display:flex;gap:8px"><span style="margin-top:7px;width:4px;height:4px;flex:none;border-radius:99px;background:rgba(255,255,255,.3)"></span>${x}</li>`).join('')}</ul></div>`,
              )
              .join('')}</div></div>`
          : ''
      const recent = d.journal
        .map(
          (j: any, i: number) =>
            `<button class="omd-btn omd-row" data-act="jsel" data-id="${i}" style="display:flex;align-items:center;justify-content:space-between;gap:8px;border:none;border-bottom:1px solid rgba(255,255,255,.06);border-radius:0;padding:11px 4px;text-align:left;font-size:13.5px;background:transparent;color:${i === d.journalSel ? '#c4b5fd' : '#c9c9d0'};font-weight:${i === d.journalSel ? '600' : '400'};text-transform:capitalize;width:100%">${j.d}${j.score != null ? `<span style="font-weight:700;color:#a78bfa">${j.score}/10</span>` : i === 0 ? '<span style="border-radius:99px;padding:2px 10px;font-size:11px;font-weight:700;background:rgba(139,92,246,.16);color:#c4b5fd">à écrire</span>' : ''}</button>`,
        )
        .join('')
      return `<h1 style="margin:0;font-size:22px;font-weight:700;letter-spacing:-0.02em">Journal</h1><p style="margin:5px 0 0;font-size:13px;color:#8f8f98">Quelques lignes par jour : ce qui a été fait, ressenti, appris. Ton coach IA peut analyser ta journée.</p>
      <div style="margin-top:20px;display:flex;flex-direction:column;gap:16px">
        <div style="border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:16px 20px"><p style="margin:0;font-size:11px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#8f8f98">Entrées récentes</p><div style="margin-top:6px;display:flex;flex-direction:column">${recent}</div></div>
        <div style="border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:20px"><div style="display:flex;align-items:center;justify-content:space-between"><h2 style="margin:0;display:flex;align-items:center;gap:8px;font-size:15px;font-weight:600;text-transform:capitalize"><i data-lucide="book-open-text" width="16" height="16" style="color:#a78bfa"></i>${e.d}</h2>${e.written ? "<span style=\"display:inline-flex;align-items:center;gap:4px;border-radius:99px;padding:2px 10px;font-size:11px;font-weight:600;background:rgba(34,197,94,.14);color:#22c55e\"><i data-lucide='check' width='11' height='11'></i>enregistrée</span>" : ''}</div><div style="margin-top:14px;min-height:150px;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:14px;font-size:13.5px;line-height:1.6;color:${e.written ? '#f6f6f4' : '#55555e'}">${e.written ? e.txt : "Comment s'est passée ta journée ? Victoires, difficultés, apprentissages…"}</div><div style="margin-top:14px;display:flex;justify-content:flex-end;gap:8px">${!e.written ? '<span class="omd-btn" style="height:40px;display:inline-flex;align-items:center;padding:0 18px;border-radius:9px;background:#8b5cf6;color:#fff;font-size:13.5px;font-weight:600">Enregistrer (+15 XP)</span>' : "<span class=\"omd-btn\" style=\"height:40px;display:inline-flex;align-items:center;gap:6px;padding:0 18px;border-radius:9px;border:1px solid rgba(255,255,255,.12);font-size:13.5px;font-weight:600\"><i data-lucide='sparkles' width='14' height='14'></i>Analyser ma journée</span>"}</div></div>
        ${analysis}
      </div>`
    }
    if (tab === 'leaderboard') {
      const podium = ['#f5c542', '#a8b0bd', '#c98a4b']
      const tabBtn = (id: string, label: string, ic: string) =>
        `<button class="omd-btn" data-act="lbtab" data-id="${id}" style="flex:1;display:flex;align-items:center;justify-content:center;gap:7px;border:none;border-radius:12px;padding:9px;font-size:13px;font-weight:500;background:${d.lbTab === id ? 'rgba(139,92,246,.14)' : 'transparent'};color:${d.lbTab === id ? '#c4b5fd' : '#8f8f98'}"><i data-lucide="${ic}" width="15" height="15"></i>${label}</button>`
      const players = d.leaderboard
        .map(
          (p: any) =>
            `<li style="display:flex;align-items:center;gap:12px;border:1px solid ${p.me ? 'rgba(139,92,246,.5)' : 'rgba(255,255,255,.08)'};background:${p.me ? 'rgba(139,92,246,.1)' : 'transparent'};border-radius:16px;padding:11px 16px"><span style="width:28px;flex:none;display:flex;justify-content:center">${p.rank <= 3 ? `<i data-lucide="crown" width="20" height="20" style="color:${podium[p.rank - 1]}" fill="currentColor"></i>` : `<span style="font-size:13px;font-weight:700;color:#8f8f98">${p.rank}</span>`}</span><span style="width:36px;height:36px;flex:none;border-radius:99px;background:rgba(139,92,246,.14);color:#c4b5fd;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px">${p.name[0]}</span><div style="flex:1;min-width:0"><p style="margin:0;font-size:14px;font-weight:600">${p.name}${p.me ? '<span style="margin-left:6px;font-size:12px;font-weight:500;color:#a78bfa">(toi)</span>' : ''}</p><p style="margin:0;font-size:12px;color:#8f8f98">Niveau ${p.level}</p></div>${p.streak > 0 ? `<span style="display:inline-flex;align-items:center;gap:4px;border-radius:99px;padding:2px 9px;font-size:11.5px;font-weight:600;background:rgba(245,185,61,.14);color:#f5b93d"><i data-lucide="flame" width="11" height="11"></i>${p.streak} j</span>` : ''}<span style="width:88px;text-align:right;font-size:13.5px;font-weight:700;color:#a78bfa;font-variant-numeric:tabular-nums">${p.xp.toLocaleString('fr-FR')} XP</span></li>`,
        )
        .join('')
      const guilds = d.guildLeaderboard
        .map(
          (g: any) =>
            `<li style="display:flex;align-items:center;gap:12px;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:11px 16px"><span style="width:28px;flex:none;text-align:center;font-size:13px;font-weight:700;color:#8f8f98">${g.rank}</span><span style="width:36px;height:36px;flex:none;border-radius:12px;background:rgba(139,92,246,.14);color:#c4b5fd;display:flex;align-items:center;justify-content:center"><i data-lucide="castle" width="18" height="18"></i></span><div style="flex:1"><p style="margin:0;font-size:14px;font-weight:600">${g.name}</p><p style="margin:0;font-size:12px;color:#8f8f98">${g.members} membres</p></div><span style="font-size:13.5px;font-weight:700;color:#a78bfa;font-variant-numeric:tabular-nums">${g.xp.toLocaleString('fr-FR')} XP</span></li>`,
        )
        .join('')
      return `<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px"><div><h1 style="margin:0;font-size:22px;font-weight:700;letter-spacing:-0.02em">Classement</h1><p style="margin:5px 0 0;font-size:13px;color:#8f8f98">${d.lbTab === 'guilds' ? 'Les guildes les plus puissantes, classées par Score global.' : '1 248 joueurs en quête de leur mission.'}</p></div><span style="display:inline-flex;align-items:center;gap:5px;height:28px;border-radius:99px;padding:0 12px;background:rgba(139,92,246,.14);color:#c4b5fd;font-size:12.5px;font-weight:600"><i data-lucide="trophy" width="13" height="13"></i>Ton rang : 5ᵉ</span></div>
      <div style="margin-top:18px;display:flex;gap:4px;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:4px">${tabBtn('players', 'Joueurs', 'user')}${tabBtn('guilds', 'Guildes', 'castle')}</div>
      ${d.lbTab === 'players' ? `<div style="margin-top:14px;display:flex;align-items:center;justify-content:space-between;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:14px 18px"><span style="font-size:14px;font-weight:600">Afficher uniquement mes amis</span><span style="width:40px;height:22px;border-radius:99px;background:rgba(255,255,255,.12);position:relative"><span style="position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:99px;background:#8f8f98"></span></span></div>` : ''}
      <ul style="list-style:none;margin:18px 0 0;padding:0;display:flex;flex-direction:column;gap:8px">${d.lbTab === 'guilds' ? guilds : players}</ul>`
    }
    if (tab === 'guilds') {
      const rows = d.guildLeaderboard
        .map(
          (g: any) =>
            `<li style="display:flex;align-items:center;gap:12px;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:12px 16px"><span style="width:24px;flex:none;text-align:center;font-size:13px;font-weight:700;color:#8f8f98">${g.rank}</span><span style="width:40px;height:40px;flex:none;border-radius:12px;background:rgba(139,92,246,.14);color:#c4b5fd;display:flex;align-items:center;justify-content:center"><i data-lucide="castle" width="20" height="20"></i></span><div style="flex:1"><p style="margin:0;font-size:14px;font-weight:600">${g.name}</p><p style="margin:0;font-size:12px;color:#8f8f98">${g.members} membres · Score global</p></div><span style="font-size:13.5px;font-weight:700;color:#a78bfa;font-variant-numeric:tabular-nums">${g.xp.toLocaleString('fr-FR')} XP</span></li>`,
        )
        .join('')
      return `<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px"><div><h1 style="margin:0;font-size:22px;font-weight:700;letter-spacing:-0.02em">Guildes</h1><p style="margin:5px 0 0;font-size:13px;color:#8f8f98">Rejoins une guilde pour progresser en équipe — ou fonde la tienne.</p></div><span class="omd-btn" style="height:36px;display:inline-flex;align-items:center;gap:7px;padding:0 15px;border-radius:9px;background:#8b5cf6;color:#fff;font-size:13px;font-weight:600"><i data-lucide="plus" width="14" height="14"></i>Créer une guilde</span></div>
      <div style="margin-top:20px;display:flex;align-items:center;gap:8px;height:40px;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:0 12px;color:#55555e;font-size:13px"><i data-lucide="search" width="15" height="15"></i>Rechercher une guilde par son nom…</div>
      <h2 style="margin:24px 0 0;display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:#8f8f98"><i data-lucide="trophy" width="15" height="15" style="color:#a78bfa"></i>Classement des guildes · ${d.guildLeaderboard.length}</h2>
      <ul style="list-style:none;margin:14px 0 0;padding:0;display:flex;flex-direction:column;gap:8px">${rows}</ul>`
    }
    if (tab === 'friends') {
      const req = d.friendReq
        .map(
          (r: any) =>
            `<li style="display:flex;flex-wrap:wrap;align-items:center;gap:12px;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:11px 16px"><span style="width:36px;height:36px;flex:none;border-radius:99px;background:rgba(139,92,246,.14);color:#c4b5fd;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px">${r.name[0]}</span><div style="flex:1;min-width:0"><p style="margin:0;font-size:14px;font-weight:600">${r.name}</p><p style="margin:0;font-size:12px;color:#8f8f98">Niveau ${r.level}</p></div><span style="font-size:12px;color:#8f8f98">${r.ago}</span><span class="omd-btn" data-act="freqok" data-id="${r.name}" style="height:30px;display:inline-flex;align-items:center;gap:5px;padding:0 12px;border-radius:8px;background:#8b5cf6;color:#fff;font-size:12.5px;font-weight:600"><i data-lucide="check" width="13" height="13"></i>Accepter</span><span class="omd-btn" data-act="freqno" data-id="${r.name}" style="height:30px;display:inline-flex;align-items:center;gap:5px;padding:0 12px;border-radius:8px;border:1px solid rgba(255,255,255,.12);font-size:12.5px;font-weight:600"><i data-lucide="x" width="13" height="13"></i>Refuser</span></li>`,
        )
        .join('')
      const friends = d.friends
        .map(
          (f: any) =>
            `<div style="border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:12px;${f.isNew ? 'animation:omPop .35s cubic-bezier(.16,1,.3,1) both' : ''}"><div style="display:flex;align-items:center;gap:12px"><span style="width:36px;height:36px;flex:none;border-radius:99px;background:rgba(139,92,246,.14);color:#c4b5fd;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px">${f.name[0]}</span><div style="flex:1;min-width:0"><p style="margin:0;font-size:14px;font-weight:600">${f.name}</p><p style="margin:0;font-size:12px;color:#8f8f98">Niveau ${f.level}</p></div></div><div style="display:flex;align-items:center;gap:6px;font-size:12px;color:#8f8f98"><span style="width:8px;height:8px;border-radius:99px;background:${f.online ? '#22c55e' : 'rgba(255,255,255,.2)'}"></span>${f.online ? 'En ligne' : 'Hors ligne · vu ' + f.seen}</div><div style="display:flex;gap:8px"><span class="omd-btn" style="flex:1;height:32px;display:inline-flex;align-items:center;justify-content:center;border-radius:8px;border:1px solid rgba(255,255,255,.12);font-size:12.5px;font-weight:600">Voir le profil</span><span class="omd-btn" style="width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;border-radius:8px;color:#8f8f98"><i data-lucide="user-minus" width="15" height="15"></i></span></div></div>`,
        )
        .join('')
      return `<h1 style="margin:0;font-size:22px;font-weight:700;letter-spacing:-0.02em">Amis</h1><p style="margin:5px 0 0;font-size:13px;color:#8f8f98">Retrouve d'autres joueurs par leur pseudo et avancez ensemble.</p>
      <div style="margin-top:20px;border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:18px"><label style="font-size:12.5px;color:#c9c9d0">Rechercher un joueur</label><div style="margin-top:7px;display:flex;align-items:center;gap:8px;height:40px;border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:0 12px;color:#55555e;font-size:13px"><i data-lucide="search" width="15" height="15"></i>Pseudo exact ou partiel…</div></div>
      ${
        d.friendReq.length
          ? `<h2 style="margin:24px 0 0;display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:#8f8f98"><i data-lucide="inbox" width="15" height="15" style="color:#a78bfa"></i>Demandes reçues · ${d.friendReq.length}</h2>
      <ul style="list-style:none;margin:12px 0 0;padding:0;display:flex;flex-direction:column;gap:8px">${req}</ul>`
          : ''
      }
      <h2 style="margin:24px 0 0;display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;color:#8f8f98"><i data-lucide="users" width="15" height="15" style="color:#a78bfa"></i>Mes amis · ${d.friends.length}</h2>
      <div style="margin-top:12px;display:grid;grid-template-columns:1fr 1fr;gap:12px">${friends}</div>`
    }
    if (tab === 'levelup') {
      const unlocked = ['Quêtes illimitées', 'Planning & routines', 'DeepWork', 'Journal quotidien', 'Classement mondial']
      const locked: [string, string][] = [
        ['Suivi des addictions', 'Pro'],
        ['Analyse IA du journal', 'Pro'],
        ['Statistiques avancées', 'Pro'],
        ['Coach IA personnel', 'Max'],
      ]
      return `<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px"><div><h1 style="margin:0;font-size:22px;font-weight:700;letter-spacing:-0.02em">Level Up</h1><p style="margin:5px 0 0;font-size:13px;color:#8f8f98">Ton abonnement, tes avantages, et ce qu'il te reste à débloquer.</p></div><span style="display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:500;color:#a78bfa"><i data-lucide="settings-2" width="15" height="15"></i>Gérer mon abonnement</span></div>
      <div style="margin-top:20px;border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden">
        <div style="background:linear-gradient(135deg,rgba(139,92,246,.14),transparent);padding:24px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px"><div style="display:flex;align-items:center;gap:16px"><span style="width:56px;height:56px;flex:none;border-radius:16px;background:rgba(139,92,246,.14);color:#a78bfa;display:flex;align-items:center;justify-content:center"><i data-lucide="rocket" width="26" height="26"></i></span><div><div style="display:flex;align-items:center;gap:8px"><p style="margin:0;font-size:11px;font-weight:500;letter-spacing:.05em;text-transform:uppercase;color:#8f8f98">Offre actuelle</p><span style="border-radius:99px;padding:1px 8px;font-size:10.5px;font-weight:700;border:1px solid rgba(255,255,255,.12);color:#8f8f98">STARTER</span></div><h2 style="margin:4px 0 0;font-size:22px;font-weight:700;letter-spacing:-0.02em">Starter</h2><p style="margin:2px 0 0;font-size:13px;color:#8f8f98">Pose les fondations de ta discipline.</p></div></div><p style="margin:0;font-size:28px;font-weight:700">Gratuit</p></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;padding:24px"><div><h3 style="margin:0;display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:#22c55e"><i data-lucide="check" width="15" height="15"></i>Débloqué avec ton offre</h3><ul style="list-style:none;margin:12px 0 0;padding:0;display:flex;flex-direction:column;gap:8px;font-size:13.5px">${unlocked.map((f) => `<li style="display:flex;gap:9px"><i data-lucide="check" width="15" height="15" style="margin-top:1px;color:#22c55e;flex:none"></i>${f}</li>`).join('')}</ul></div><div><h3 style="margin:0;display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:#8f8f98"><i data-lucide="lock" width="15" height="15"></i>Encore verrouillé</h3><ul style="list-style:none;margin:12px 0 0;padding:0;display:flex;flex-direction:column;gap:8px;font-size:13.5px">${locked.map(([f, tag]) => `<li style="display:flex;align-items:center;gap:9px;color:#55555e"><i data-lucide="lock" width="13" height="13" style="flex:none"></i><span>${f}</span><span style="margin-left:auto;border-radius:99px;padding:1px 8px;font-size:10px;font-weight:700;background:rgba(139,92,246,.16);color:#c4b5fd">${tag}</span></li>`).join('')}</ul></div></div>
      </div>`
    }
    if (tab === 'changelog') {
      const meta: Record<string, [string, string, string, string]> = {
        new: ['Nouveau', 'sparkles', 'rgba(139,92,246,.16)', '#c4b5fd'],
        improvement: ['Amélioration', 'wrench', 'rgba(34,197,94,.14)', '#22c55e'],
        fix: ['Correctif', 'bug', 'rgba(245,185,61,.14)', '#f5b93d'],
      }
      const cards = d.changelog
        .map(
          (v: any) =>
            `<div style="border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:22px"><div style="display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:8px"><h2 style="margin:0;font-size:17px;font-weight:600"><span style="color:#a78bfa">v${v.v}</span> — ${v.title}</h2><p style="margin:0;font-size:12px;color:#55555e">${v.date}</p></div><ul style="list-style:none;margin:16px 0 0;padding:0;display:flex;flex-direction:column;gap:10px">${v.changes
              .map(([type, txt]: [string, string]) => {
                const [lbl, ic, bg, col] = meta[type]
                return `<li style="display:flex;align-items:flex-start;gap:10px;font-size:13.5px"><span style="display:inline-flex;align-items:center;gap:4px;border-radius:99px;padding:2px 9px;font-size:11px;font-weight:600;background:${bg};color:${col};flex:none"><i data-lucide="${ic}" width="11" height="11"></i>${lbl}</span><span style="color:#8f8f98">${txt}</span></li>`
              })
              .join('')}</ul></div>`,
        )
        .join('')
      return `<h1 style="margin:0;font-size:22px;font-weight:700;letter-spacing:-0.02em">Nouveautés</h1><p style="margin:5px 0 0;font-size:13px;color:#8f8f98">Ce qui a changé dans One Mission, version après version.</p>
      <div style="margin-top:24px;display:flex;flex-direction:column;gap:16px">${cards}</div>`
    }
    return `<div style="padding:60px 0;text-align:center;color:#8f8f98;font-size:14px">Section de démonstration.</div>`
  }
}
