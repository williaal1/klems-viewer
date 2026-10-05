# KLEMS Viewer

A standalone viewer for the US production structure at KLEMS resolution, separate from `../Visualizer/`. Started 2026-10-04.

## What it is (Alex, 2026-10-04)

- **Main view:** the lightly disaggregated production structure, meaning the KLEMS industries at their default resolution.
- **Heads-up display (HUD):** click an industry to get its disaggregated production function, a readout of every part of KLEMS-C behind it, at the finest grain we have:
  - **K:** the capital stock by asset type, from the BLS TFP capital details.
  - **L:** the labor force by occupation, with wages attached, from OEWS.
  - **E / M / S:** wired in later from the I-O data.
  - **C:** emissions.
- **Order of work:** KLEMS at its own resolution first. Then bring in the I-O data to wire up the E/M/S side, meaning who each industry buys its energy, materials and services from.

## KLEMS-C

**C is for carbon.** Emissions are an **output** of production, a coproduct that sits beside gross output, not an input (Alex, 2026-10-04). This replaces the Feb 2026 "KLEMS-e" naming in `../../Speculative Expansions/Plans Archive/02-09-26/`, where "e" meant *extended* (energy broken out by carrier). Those specs are still worth mining for the energy-carrier breakdown, which is a separate idea.

## Data audit (stage 1, 2026-10-04)

Everything here is read from the Data Sources library. Checks were run with scripts in the session scratchpad and are not yet saved in this folder.

| Role | Library module | Industries | Years | Grain |
|---|---|---|---|---|
| Spine: KLEMS quantities, costs and contributions | `BEA/bea-bls-production-account` | 63 (61 private + Federal + State & local) | 1997–2023 | K by 5 types and 6 asset classes; L college / non-college; E, M, S |
| Nominal cost composition | `BEA/bea-klems` | same codes | 2017–2024 | dollars and shares of gross output |
| **K detail** | `BLS/tfp-capital-details` | 61 private | 1987–2024 | **27–77 asset types per industry (median 54)**: productive and wealth stock, capital input, investment, depreciation, rental price, cost share |
| **L detail** | `BLS/oes-occupational-wages` | ~444 NAICS (national) | 2011–2025 | 830 detailed occupations, median 189 per 3-digit industry; employment, mean wage and wage percentiles |
| E/M/S wiring (later) | `BEA/input-output-accounts` (via the Visualizer pipeline) | 71 summary | annual to 2024 | dollar flows |
| C (later) | `useeio-v25-models` (already in the Visualizer) | 71 summary | 2017–2022 | Mt CO2e |

**How the industry lists line up:**
- **KLEMS ↔ capital detail: 61 of 61 private industries match one-to-one.** The check matched normalized names, and nothing was left over on either side. BLS capital detail has no government industries.
- **I-O 71 → KLEMS 63 nests cleanly.** 58 codes are identical. The other 13 I-O codes each roll into exactly one KLEMS industry:
  - 4 retail codes → `44RT`
  - `622` + `623` → `622HO`
  - `HS` + `ORE` → `531`
  - 3 federal codes → `GF`
  - 2 state & local codes → `GSL`

  Because the nesting is clean, wiring E/M/S means summing I-O dollar flows into the 63 industries, with no splitting.
- **KLEMS ↔ OEWS: mostly clean, with known holes:**
  - OEWS 2011–2021 uses the same industry codes as KLEMS (NAICS 2012/2017). **OEWS 2022 onward switches to NAICS 2022**, which reshuffles the Information sector (511/515/518/519 become 513/516/517/518/519), so those years need a remapping step.
  - **No farms.** OEWS covers no crop or animal production (111/112).
  - **Government is lumped together.** OEWS puts federal, state and local into one code (999), with government schools and hospitals placed in their industries by ownership code. Splitting it into `GF` and `GSL` needs the ownership codes.
  - **OEWS counts wages only, for employees only.** It leaves out benefits and the self-employed, which KLEMS labor compensation includes. So an occupation-by-wage readout will not sum to KLEMS L. The HUD should show that gap rather than hide it.

**Window where every source lines up:** 2017–2021 (KLEMS, capital detail, OEWS on old NAICS, emissions). 2017 is also the year of the Visualizer's wired object and the 402-industry I-O detail.

## Decisions (Alex, 2026-10-04)

- **Year: 2017.**
- **All 63 industries, government included.**
- **Main view, for now:** spheres sized by value added, the largest in the middle, spiralling outward. Alex: "just goofing around till we come up w a strong reason for it to look a way."

## Value added: two measures that don't match

The spheres use the **production account's own value added**, which by its construction equals capital compensation plus labor compensation; the pipeline checks this per industry to within $5m. It is **not** GDP-by-industry value added:

| | Production account (63 summed) | GDP by industry (`bea-klems`, All industries) |
|---|---|---|
| 2017 total | $19,761.7bn | $19,612.1bn |

- **Private industries come out lower.** The gap tracks each industry's taxes on production, but not exactly. Examples: wholesale is −$211bn against $223bn of taxes on production; retail is −$210bn against $232bn.
- **Government comes out higher:**

  | | Production account | GDP by industry | Capital compensation in the production account |
  |---|---|---|---|
  | Federal | $974bn | $767bn | $484bn |
  | State & local | $2,352bn | $1,689bn | $907bn |

  The production account carries far more capital compensation for government than NIPA's government operating surplus, which is just depreciation.
- **Visible effect:** State & local is the largest sphere, ahead of real estate ($2,332bn).
- **Cause not confirmed from BEA documentation yet.** The workbook ReadMe says only that the integrated account is "fully consistent with official GDP statistics."

## Running it

Serve the folder over HTTP (ES modules don't load from `file://`), for example `python3 -m http.server` inside this folder, then open `http://localhost:8000/`.

- `pipeline/build_industries.py` rebuilds `data/industries.json` from the library.
- `_checks/shoot.py` renders the page headlessly and checks for overlapping spheres and a working hover.
- `vendor/` holds Three.js, copied from `../Visualizer/vendor/`.

## The readout panel (stage 4, built 2026-10-04; restructured the same day)

Click a sphere to open its panel; click empty space or press Esc to close it.

**Seven pages (Alex, 2026-10-04): Overview, K, L, E, M, S, C.** Move between them with the tabs, the ← / → keys, or by clicking a row on the Overview. The open page stays open when you click another industry. **The panel's width follows each page's content (Alex, 2026-10-04)**, between 400px and 760px. The sphere view and the source line refit as it changes. Measured for chemicals: Overview 400, E/M/S ~420–430, C 518, K 672, L 760.

- **Overview.**
  - Gross output, value added, share of all value added.
  - Gross output split into K, L, E, M and S as a bar, one row per letter, with C (an output) as the last row.
  - Industry notes.
- **K.** Source for capital income: BEA-BLS production account. Source for capital stock: BLS capital details, 61 private industries.
  - Capital income by type, and by asset class. The production account's six classes cover tangible capital only. Intellectual property is added as a seventh class from K by type (the gap equals IP to within $2m in every industry).
  - Capital stock by broad class: productive stock, investment, depreciation rate, share of capital income.
  - IT-equipment and intellectual-property sub-splits.
  - Every asset type: top 10, plus "show all".
  - BLS's capital cost is left out on purpose. It is a separate estimate from the production account's K, and the two diverge sharply in places (median ratio 1.0; securities ×18, real estate ×0.28).
- **L.**
  - Labor compensation by college / non-college.
  - The OEWS wage bill compared with KLEMS labor compensation.
  - **Two side-by-side tables, supervisory and nonsupervisory**, each with occupation, jobs and mean wage: top 15, plus "show all". Wage percentiles were dropped (Alex, 2026-10-04).
  - **Which wage (Claude, 2026-10-04): mean, not median.** Mean wages combine exactly across the ~16 KLEMS industries made of several OEWS industries; medians can't be combined.
  - **Definition of supervisory (Claude, 2026-10-04):** all management occupations (SOC major group 11) plus the 18 "First-Line Supervisors" occupations. That puts 9.9% of jobs on the supervisory side. BLS's payroll survey (CES), May 2017, has 17.6% of private jobs outside "production and nonsupervisory". CES's split is broader, because in goods industries it separates production workers from all non-production staff (29.8% in manufacturing). So this rule is a narrower, occupation-based "managers and supervisors".
- **E, M, S.** Amount spent, share of gross output, share of intermediate inputs. Who it is bought from arrives with the I-O wiring.
- **C.** Placeholder.

**Files**
- `pipeline/crosswalk.csv`: KLEMS code → BLS capital code → OEWS codes and ownership. It is reviewable.
- `pipeline/build_readout.py` builds `data/readout/<code>.json`, one file per industry (3.3 MB in total).
- `js/panel.js`: the panel.
- `_checks/shoot_panel.py` opens all 63 panels and checks each.

**Checks** (run 2026-10-04; all pass)
- Production account: VA = K + L, and asset classes + IP = K.
- Capital: asset-level stocks sum to BLS all-assets stock (exact in 2017, the base year), and asset income shares sum to 1.
- Labor pages: supervisory + nonsupervisory jobs = 141.09M. The other 1.7M are in occupation cells OEWS suppresses.
- Employment: the labor panels sum to 142.75M against OEWS's all-industry total of 142.55M (+0.1%). The private panels are +0.2% against OEWS's private-only total. That fits the two industries that use the private + local government row, whose local-government jobs are also counted in State & local.
- Wage bill / labor compensation: 33–98% across industries, median 61%. It never exceeds 100%, as expected.
- All 441 pages (63 industries × 7) render in headless Chromium with no errors and no NaN or undefined values. The arrow keys step through pages, the page carries over between industries, and Esc closes the panel.

**Coverage gaps shown on the panel**
- Farms: no occupation data.
- Federal and State & local: no asset-level capital.
- 713 (amusement and gambling) and 721 (accommodation): OEWS publishes these only for private + local government (ownership group 57).
- 113FF: no fishing (114) in OEWS 2017.

**Library issues found** (to fix in the library through its own process; worked around here)
- `oes-occupational-wages` repeats rows: 1,588 exact duplicates in the 2017 national data, plus codes listed at two levels, e.g. 531000 as both 3- and 4-digit. Summing without deduplicating overstated employment by 3.7%. The pipeline drops repeats after checking that no two published values disagree.
- `oes-occupational-wages` turns suppressed (`*`) and top-coded (`#`) wages into the same NA, so the panel can only say "not published".

## Main view: a bookcase (Alex, 2026-10-04)

The view is meant to be the **easy-to-engage data overview**.
- **Shelves.** One labeled shelf per kind of industry: 16 shelves, BEA's sectors from the EPA useeio crosswalk, with manufacturing split into nondurable and durable. These are the same groups the E/M/S tables use. Each label strip carries the sector's total value added.
- **On each shelf,** spheres sit largest to smallest, left to right.
- **Shelf order.** Shelves run in reading order, largest sector first.
- **Bays.** The bookcase re-shelves into 1–4 bays to suit the space it has (3 bays full-screen, fewer with the panel open). All 16 labels show at 1440×900 and 1280×720, panel open or closed.
- **Camera.** It sits above the top shelf, so every plank is seen from above.
- **No links between spheres** (Alex, 2026-10-04).
- **Specimen tags** (Alex, 2026-10-04; they replace the white names that were drawn on the spheres).
  - Every sphere has a cream card on a string with its short name, leaving the sphere's upper right at 45°. Shelves run largest to smallest, so a tag only passes over smaller neighbours.
  - The tags are part of the 3D scene, so they scale with the view, and clicking or hovering a tag acts on its sphere.
  - Shelves reserve room for their tags, and spheres sit at least `MIN_DX` apart so parallel tags clear each other.
  - `_checks/tags.py` confirms in scene geometry that no tag overlaps another tag or crosses a sphere (0 and 0).
  - On-screen card height at 1440×900 is 11.9–16.2px with the panel closed, and 7.3–10.2px with the panel open, where the text is too small to read (hover still names every sphere).
  - Names come from `pipeline/short_names.csv` (editable): 58 copied from the Visualizer's short names, and 5 KLEMS merges named by Claude.
- **An emoji on each sphere** (Alex, 2026-10-04).
  - Picks are in `pipeline/emoji.csv`: Claude's drafts, with a one-line reason each, for Alex to edit.
  - Drawn facing the camera at 1.2× the sphere's radius, using the system emoji font, so they look different on Windows and Android than on a Mac.
  - All 63 checked by eye on a contact sheet (`_checks/shots/04_emoji_sheet.png`), and `_checks/tags.py` flags any that draw blank.
- The earlier cluster layout and the names-on-spheres version are kept in the session scratchpad only.

## E, M, S pages: what each industry buys (stage 5, built 2026-10-04)

- **Source.** BEA's 2017 detail Use table, before redefinitions, at **purchasers' prices** (BEA values KLEMS intermediate inputs at purchasers' prices). It has 394 commodities.
- **Total check.** Each industry's total purchases equal the production account's E + M + S within 0.2% for all 63 industries. The pipeline stops if any don't.
- **Grouping.** Each page groups purchases by the sector that makes them, then BEA's summary commodity; click a group to see the detailed commodities.
- **E / M / S split: a documented approximation (Alex, 2026-10-04).** BEA assigns E, M and S cell by cell at an unpublished working level (about 5,000 products × 800 industries), so no commodity rule reproduces it exactly. Rules, from BEA's written definitions (`research/ems-classification/KEY_QUOTES.md`):
  - fuels (211000, 212100, 221100, 221200, 324110) are energy;
  - except that crude and petroleum products bought by refining (324) and chemicals (325) are materials (feedstock);
  - oil & gas bought by oil & gas extraction is materials (own use; Claude's inference);
  - other goods are materials, and everything else is services.
- **How close it gets.** Economy-wide, listed vs published is E +1.0%, M +1.0%, S −0.7%. Industries within 5%: E 49, M 44, S 42 of 63. Worst cases: chemicals' E at 66%, air transport's M at 199%, and one industry's S at 361%.
- **On the page.** It shows BEA's published total and the listed sum side by side. Nothing is scaled.

## C page: carbon (stage 6, built 2026-10-05)

- **Source.** EPA USEEIO v2.5, model **kingbird-17**: 2017 emissions on BEA's 71 summary industries, IPCC AR6 100-year warming potentials. Summed into the 63 KLEMS industries with the same merges as the rest of the viewer.
- **Contents.**
  - Direct emissions (Mt CO₂e), with the share of all industry emissions.
  - Direct emissions per dollar of output.
  - Split by gas: CO₂, methane, nitrous oxide, fluorinated gases.
  - Per-dollar emissions direct vs including the supply chain (EPA's N), with the share that happens upstream.
  - The Overview's C row now shows Mt.
- **Checks.**
  - Gases sum to EPA's direct CO₂e in every sector.
  - The 63 industries total 5,050.4 Mt, equal to EPA's 71-sector total.
  - Industry-attributed CO₂ (3,769 Mt) is 73.4% of EIA's 2017 total energy CO₂ (5,131 Mt, library `EIA/energy-co2-emissions`), consistent with the 73% the EPA module documents for 2022. The gap is households' own emissions.
  - EPA's 2017 output vs the production account's gross output: median ratio 1.002, 40 of 63 within 1% (State & local 0.80, retail 1.13). Per-dollar figures use EPA's own output.
- **Not checked.** Power-sector CO₂ against EIA: the library's EIA module has CO₂ by fuel only. Note that public power sits in the government-enterprise industries (GSLE, GFE), not in utilities.
- **Supply-chain intensities are per dollar only.** They double count across industries, so they are never summed.

## Capital detail: sources considered

- **Census ACES (Annual Capital Expenditures Survey): not used for granularity (Alex, 2026-10-04).**
  - For 2017 it publishes detailed types (29 equipment, 32 structures) only for all industries combined.
  - By industry it has only 6 equipment groups and 12 structure groups, at sector level.
  - BEA's 97 asset types × 74 industries already draw on special tabulations of it.
  - Research and sources are archived in `research/aces/` (see `SOURCES.md` there).

- **BEA detailed fixed assets: in the library, not on the panel for now (Alex, 2026-10-04).**
  - The library module `BEA/fixed-assets-detailed` now holds net stock and depreciation by industry × asset (96 assets × 74 industries, 1925–2025), as well as investment. Checked: 2017 nonresidential net stock is $24,066,894m against BEA's standard table 4.1 (FAAt401) at $24,066,902m.
  - BEA's asset types per industry are about as many as BLS's (chemicals 61 vs 61), so the K page stays on BLS.
  - BEA's real extras are held for later:
    - a sub-industry split for 8 KLEMS industries, e.g. utilities into electric / gas / water;
    - R&D by type (chemicals: $555bn pharmaceutical vs $66bn other).
  - The module's new stock files are BEA's September 2026 vintage; its older files are September 2025. 2017 is identical in both. Left as is.

## Status

- [x] Stage 1: data audit and crosswalk check (above).
- [x] Year and industry scope: 2017, all 63 industries.
- [x] Stage 2: pipeline (`pipeline/build_industries.py` → `data/industries.json`).
- [x] Stage 3: main view, a first cut (spiral of spheres with wider spacing, and hover).
- [x] Stage 4: readout panel: seven pages, with K and L filled in.
- [x] Stage 5: E/M/S pages filled from the I-O Use table (grouped tables, no links); main view grouped by kind of industry.
- [x] Stage 6: C page from EPA USEEIO kingbird-17.
