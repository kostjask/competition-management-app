# Dance Express: supplied festival rules

Source: six screenshots supplied by the user in this session, read together with
the completed [director questionnaire](ENTRY_POLICY_QUESTIONNAIRE.md). This is a
transcription and interpretation record, not implemented configuration or a
claim that the images are an approved general policy for every festival.
The original screenshots remain session attachments, outside the repository.

The user's requirement is that each festival/competition can adjust its rules
without making event creation complicated. The questionnaire supplies the newer
application-workflow requirements; the images supply this festival's concrete
nomination, age, format and other rules. Conflicts are identified below rather
than silently resolved. [ADR-025](adr/025-entry-submission-lifecycle.md) owns the
resulting entry-workflow decision record and remaining questions.

## Event facts: image 1

- Name: Dance Express, a dance festival-competition.
- Organizer: Dance group Neposedy, Tallinn, Estonia.
- Dates shown: December 5–6, 2026.
- Venue: Mere Kultuurikeskus, Mere pst. 5.
- The screenshot does not specify start/end times or deadline cutoff times.
  Tallinn is a location; actual configuration must use Europe/Tallinn explicitly.

## Nominations: image 2

Standard categories: stage dance, contemporary dance, lyrical dance, folk dance,
folk-stylized dance, show dance, street dance, classical dance (ballet), ballroom
dance. Kids dance is a separate category with different allowed formats/durations.

| Category set | Age bands shown | Formats |
| --- | --- | --- |
| Standard categories above | 7–10, 11–13, 14–17, 18–25, 26 and older | Big group, small group, duet, solo |
| Kids dance | Up to 7 inclusive | Big group and small group |

| Format | Dancer count | Standard maximum duration | Kids-dance maximum duration |
| --- | --- | --- | --- |
| Big group | 7 or more; no upper bound stated | 4 minutes (240 seconds) | 3 minutes 30 seconds (210 seconds) |
| Small group | 3–6 | 4 minutes (240 seconds) | 3 minutes 30 seconds (210 seconds) |
| Duet | 2, by the format's meaning | 2 minutes 30 seconds (150 seconds) | Not listed as an allowed kids format |
| Solo | 1, by the format's meaning | 2 minutes 30 seconds (150 seconds) | Not listed as an allowed kids format |

No minimum duration or extra timing tolerance is stated. "Up to" supports an
inclusive maximum. An implementation must not invent a maximum big-group count
or use the standard duration for kids dance. The categories' allowed age/format
combinations are meaningful, not three independent unrestricted dropdown lists.
Age 7 occurs in both the kids band and the first standard band; do not silently
deduplicate or turn the published bands into mutually exclusive buckets.

## Category explanations: image 3

The descriptions identify the artistic categories: theatrical stage work;
contemporary technique and expression; lyrical fusion; traditional folk dance;
folk-inspired stylization; show/spectacle; street styles; classical ballet;
ballroom styles; and age-appropriate children's choreography. These are authored
festival content. Their descriptions need the normal source-language/translation
contract when an organizer editor is implemented; they are not eligibility
formulas or scoring templates by themselves.

## Entry and age rules: image 6 and questionnaire

- Places are limited by event time constraints; there is no stated limit on the
  number of dances a studio may submit. This does not mean unlimited event capacity.
- Previously performed pieces are allowed.
- Age uses completed years on the first competition day. The questionnaire
  confirms the existing event-local reference date and March 1 leap-birthday rule.
- Younger dancers are unrestricted.
- Image 6 permits no more than 20% from the **next older** age group. Questionnaire
  answer 3 says 20% older dancers without that upper-age qualification. The user
  explicitly confirmed "older generally" afterward: the application policy has
  no next-group upper-age cap. That explicit clarification supersedes the image.
- For a percentage ceiling, use exact integer comparison, not rounding up an
  allowed dancer count: at 20%, 1 of 5 is allowed, 1 of 4 exceeds the allowance.
  This is the mathematical meaning of "no more than 20%", pending any explicitly
  approved exception. Solo/duet entries therefore get no automatic older dancer.
- The organizer may verify ages when judges raise a question.
- Each performance must credit its choreographer. Questionnaire answer 1 also
  requires teacher and author information in final details. Keep those terms
  visible until an organizer confirms whether author and choreographer are the
  same role; do not silently drop teacher information.
- Organizer exceptions are expressly allowed by questionnaire answer 14. Their
  reason, real actor and retained version must be recorded; an exception is not
  permission to accept a cross-event participant or corrupt relationships.

## Music: image 6 and questionnaire

The screenshot describes email delivery by December 1, 2026, names files using
the dance studio and dance name, requests a USB backup, and requires advance
delivery and high-quality audio. It prohibits vulgar/offensive/explicit lyrics,
with possible disqualification or point deduction.

The questionnaire specifies the new application's workflow: music can be supplied
independently of the basic/final details checkpoints; the representative uploads
and confirms the correct version, then cannot replace it without an organizer
reopening access. Organizer acceptance is a separate state. Missing music should
trigger a reminder. Therefore email-only delivery is source context, not a reason
to replace the requested upload/confirmation workflow. The screenshot gives no
exact December 1 cutoff time or technical file type/size/audio-quality limits.
Those must not be invented from the wording "high-quality".

## Participation fees and withdrawal: image 5

| Format | Published fee |
| --- | --- |
| Big group | EUR 20 per dancer for their first big-group dance, EUR 12 for each subsequent big-group dance involving that dancer |
| Small group | EUR 20 per dancer for each dance |
| Duet | EUR 25 per dancer for each dance |
| Solo | EUR 30 per dancer for each dance |

Each competitor receives a participation diploma and branded gift. Timely
payment is a participation condition; organizer agreements may provide an
exception. Accommodation/food enquiries are handled by contacting the organizer.

The text says withdrawing a dance or participant less than 10 days before the
competition incurs 50% of the participation fee; less than 3 days makes the fee
non-refundable. A participant reported absent within that last period still
receives the gifts prepared for them. Exact boundary handling at 10 and 3 days,
the ordering rule for a dancer's "first" big-group dance, invoicing identities and
payment statuses need their owning billing decision. Do not calculate fees or
refunds as part of this entry-lifecycle slice. Withdrawal permission and financial
consequences are separate; retaining a withdrawn entry supports later accounting.

## Awards and scoring: image 4

- Criteria shown: technique/execution (10), choreography (10), performer artistry
  (10), compliance with declared category/age (5), music/costumes (5).
- Category/nomination placements use judge scores: first–third receive diplomas
  and trophies; fourth–sixth receive diplomas on stage; all participants receive
  participation diplomas. Kids entries outside the top three receive special
  consolation prizes. Organizers may award additional special prizes.
- A performance gets one place; tied scores can share places. First–third places
  may be withheld for fewer than six performances and scores below a required
  minimum. The minimum score and precise combined condition are not specified.
- Grand Prix prizes shown: gold EUR 400, silver EUR 300, bronze EUR 200, based on
  the highest/second/third total of a group's best three eligible dances. Only big
  and small group results count. Eligible dances must differ in category or age;
  for repeated category/age combinations the highest score counts. At least one
  of the three must be outside folk/folk-stylized dance because those are closely
  related. The identity of the competing "group" and exact tie/selection rules
  need the scoring/result model decision.
- Score breakdown is to be published a few days after the competition.

The Grand Prix examples use an 11–14 label, while the nomination table says
11–13. Preserve this as a source inconsistency; do not create an 11–14 entry
band from an award example. Scoring, awards, penalties, payment automation and
public results retain their existing Phase 6/7 or future billing gates. These
images do not authorize implementing that unrelated work now.

## Other published terms: image 6

Organizers may deny participation for knowing rule violations, unethical conduct
or failed payment terms. Choreographic rights and attribution must be respected;
internationally recognized choreography is allowed in classical/folk categories
with original attribution. Props must be safe, stage setup/teardown quick, and
teams clear their own props. Fire, water, confetti and sharp objects require
explicit organizer authorization. Costumes must suit the performance and can be
subject to organizer intervention. Professional conduct is required; organizers
make final decisions on uncovered disputes. The terms also describe permission
to photograph/film for promotion/archive.

These are festival terms to display/acknowledge through their owning workflow.
Do not infer that this alone satisfies the application's privacy/legal review,
or create automatic disqualification, scoring penalties or legal-consent records
without the corresponding domain contracts.
