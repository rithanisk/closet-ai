# Product Requirements Document: AI Wardrobe & Personal Stylist

**Working title:** Closet AI  
**Document status:** Design-ready MVP specification  
**Primary platform:** Desktop web application  
**Primary audience:** Women ages 16–30, especially students, college users, and new graduates  
**Purpose of this document:** Provide sufficient product, interaction, and visual context for designing the complete MVP UI

---

## 1. Product overview

Closet AI is a desktop application that turns a user's personal photos into a digital wardrobe and uses that wardrobe to recommend complete outfits.

The user can upload any photo containing clothing or accessories. The app detects each visible wearable item, extracts it from the image, categorizes it, and stores it in the user's wardrobe inventory. The user can review and modify that inventory at any time.

When the user needs something to wear, they describe the situation in natural language. The app considers the occasion, location, weather, personal constraints, current fashion trends, and the user's learned aesthetic. It then recommends three complete outfits made primarily from items the user already owns.

The central promise is:

> See everything you own and quickly choose an aesthetic, appropriate outfit without searching through your entire closet.

---

## 2. Problem

Many people own enough clothing to make good outfits but still feel that they have nothing to wear. They cannot easily remember everything in their closet, struggle to visualize combinations, and spend too long deciding what is appropriate for a particular setting.

Existing wardrobe apps often make the user photograph, crop, label, and categorize every item manually. Generic styling apps may provide attractive inspiration, but their recommendations are disconnected from what the user actually owns.

Closet AI solves both problems by automating wardrobe creation from existing photos and grounding recommendations in the user's real inventory.

---

## 3. Target user

### Primary persona

A woman between 16 and 30 who is in school, college, or the early stages of her career. She cares about looking put together but may not consider herself a fashion expert. She owns a varied wardrobe, uses social media for style inspiration, and regularly experiences decision fatigue when choosing an outfit.

### Core needs

- See the contents of her wardrobe without physically searching through it.
- Know which pieces work well together.
- Receive fast recommendations for a specific occasion.
- Feel current and stylish without losing her personal aesthetic.
- Make better use of clothing she already owns.
- Understand which new item would genuinely complement several existing pieces.

### Initial positioning

The initial recommendation experience is optimized for women's clothing and styling. The underlying interface should not make future support for other genders or audiences difficult.

---

## 4. MVP goals

1. Let a new user create a useful digital wardrobe by uploading existing photos.
2. Automatically detect and extract visible garments and accessories.
3. Give the user a clear, editable inventory of what they own.
4. Generate three complete, aesthetic outfit recommendations for a user's situation.
5. Consider location, weather, occasion, stated constraints, personal taste, and current style trends.
6. Learn from outfits the user approves and saves.
7. Provide useful alternatives without returning an incomplete outfit.

### Desired first-session outcome

By the end of a successful first session, the user has:

- Uploaded one or more photos.
- Reviewed the detected items.
- Added those items to a digital wardrobe.
- Asked the stylist for an outfit.
- Received three complete outfit options that can be worn immediately.

---

## 5. MVP assumptions

The following decisions fill gaps that have not yet been explicitly specified. They should be treated as product assumptions that can be revised after initial user testing.

- “Desktop app” means a desktop-first web application used in a browser.
- Original uploaded images are deleted after processing. Extracted garment cutouts and generated item metadata are retained so the wardrobe continues to function.
- Detected items enter a review step before being permanently added to the wardrobe.
- Outfit recommendations use only active wardrobe items. When an ideal category is missing, the app uses the closest suitable owned alternative and may separately show an optional shopping suggestion.
- Shopping suggestions describe a useful wardrobe gap in the MVP. Direct retailer listings, affiliate links, checkout, and live product inventory are not required.
- Current trends are represented through periodically refreshed trend knowledge rather than a live social-media feed.
- Saved and approved outfits are the primary personalization signal for the MVP. Explicit preferences gathered during onboarding are also used.
- English is the initial interface language.
- Basic email-and-password authentication is sufficient for the first version.

---

## 6. Product principles

### Wardrobe-first

The product should help users make better use of what they own. Shopping content must remain secondary and should never dominate outfit results.

### Fast to value

Users should not need to manually catalog every item before seeing a recommendation. The application should work with a partially completed wardrobe and clearly improve as more items are added.

### User-controlled AI

Automatic extraction should eliminate repetitive work, but every detected item must remain editable. The app should communicate uncertainty rather than pretending every inference is correct.

### Personal, not prescriptive

Recommendations should feel like advice from a stylist who understands the user. The app should explain why an outfit works without presenting subjective fashion choices as objective rules.

### Complete and wearable

Every final recommendation must be a wearable outfit, not a loose collection of potentially compatible items.

---

## 7. Information architecture

Use a persistent left navigation on desktop.

### Primary navigation

1. **Home** — overview, recent activity, quick outfit request, and wardrobe status
2. **Wardrobe** — inventory browsing, filtering, editing, and uploading
3. **Stylist** — conversational outfit request and recommendation experience
4. **Saved outfits** — approved, saved, and previously worn outfits
5. **Settings** — profile, style preferences, location, privacy, and account management

### Persistent global actions

- Upload photos
- Ask the stylist
- User profile/account menu
- Notifications or processing status, if needed

---

## 8. Core user journeys

### Journey A: First-time onboarding

1. User lands on a concise product introduction.
2. User creates an account or signs in.
3. User sets basic style preferences.
4. User optionally provides or confirms a current city for weather.
5. User uploads photos containing clothing.
6. The app processes the photos and shows visible progress.
7. User reviews extracted items, corrects mistakes, and confirms the wardrobe additions.
8. User arrives at a populated wardrobe.
9. The app invites the user to request a first outfit.
10. User describes the occasion and receives three recommendations.

Onboarding should be resumable. The user should be able to skip optional preference questions and improve the profile later.

### Journey B: Add clothes from photos

1. User selects **Upload photos**.
2. User drags files into a drop zone or selects them from the computer.
3. The app validates the files and begins processing.
4. Each photo displays an individual processing state.
5. Detected garments and accessories appear as separate item cutouts.
6. The app flags possible duplicates and low-confidence classifications.
7. User reviews, edits, removes, or confirms each item.
8. Confirmed items appear in the wardrobe.
9. Original uploaded photos are deleted after extraction and confirmation.

### Journey C: Browse and modify the wardrobe

1. User opens **Wardrobe**.
2. User browses a visual grid of item cards.
3. User searches, filters, or sorts the inventory.
4. User opens an item to see its details.
5. User modifies metadata, replaces the cutout, marks it unavailable, archives it, or deletes it.

### Journey D: Request an outfit

1. User opens **Stylist** or uses the quick request field on Home.
2. User enters any prompt or constraint in natural language.
3. The app extracts known context and identifies missing information.
4. If essential context is missing, the stylist asks a concise follow-up question.
5. The app obtains weather for the current or manually entered location.
6. The app generates three complete outfits from the wardrobe.
7. User compares the outfits, opens one for details, or asks for revisions.
8. User saves or approves an outfit, adding it to the personalization history.

Example request:

> I need an outfit for an outdoor birthday dinner tonight. I want to look feminine and polished, but I will be walking, so no heels.

Example follow-up:

> Which city will you be in tonight so I can account for the weather?

### Journey E: Refine an outfit

1. User selects an outfit.
2. User asks for a change in natural language or selects an item-level replacement action.
3. The app preserves the rest of the outfit unless the requested change makes it incompatible.
4. The app explains material changes when necessary.
5. The user approves or continues refining the result.

### Journey F: Review saved outfits

1. User opens **Saved outfits**.
2. User browses approved combinations.
3. User opens an outfit to review its items and context.
4. User can mark it as worn, edit it, reuse it for a similar event, or remove it from saved outfits.

---

## 9. Screen requirements

### 9.1 Welcome and authentication

#### Purpose

Explain the product's value and let users enter the application with minimal friction.

#### Required UI

- Product name and short value proposition
- Editorial wardrobe or outfit visual
- Create-account form
- Sign-in form
- Password recovery
- Brief privacy statement explaining that original photos are deleted after item extraction

#### UX notes

- Do not overload this screen with feature explanations.
- The visual should communicate personal styling and wardrobe organization, not online shopping.

### 9.2 Style onboarding

#### Purpose

Create a useful starting style profile without delaying the first recommendation.

#### Suggested onboarding steps

1. Preferred aesthetics using visual cards and plain-language labels
2. Favorite and avoided colors
3. Comfort and practical preferences
4. Typical occasions or dress codes
5. Default city or permission to use approximate location

#### Style examples

- Minimal
- Feminine
- Streetwear
- Classic
- Preppy
- Romantic
- Edgy
- Sporty
- Y2K
- Business casual

The user can select multiple aesthetics. This list is not exhaustive and should include a free-text field such as “Describe your style in your own words.”

#### Constraint examples

- Preferred heel height
- Desired coverage or modesty
- Colors to avoid
- Comfort priority
- Temperature sensitivity
- Clothing types the user rarely wears

All questions except account creation should be skippable.

### 9.3 Home dashboard

#### Purpose

Provide an immediate entry point into outfit recommendations while giving the user visibility into their wardrobe.

#### Required sections

- Prominent “What are you dressing for?” prompt input
- Current location and compact weather summary
- Primary action to generate an outfit
- Wardrobe summary with item count and category breakdown
- Recently added items
- Recently saved outfits
- Prompt to upload more clothing when the wardrobe is limited
- Processing status for any active uploads

#### Empty state

When the wardrobe is empty, replace most dashboard content with a guided upload call to action and a short explanation of how photo extraction works.

### 9.4 Photo upload

#### Required UI

- Large drag-and-drop target
- File picker
- Multi-file support
- Accepted file types and size guidance
- Per-file thumbnail and progress state
- Ability to cancel an individual upload
- Clear explanation that all visible garments and accessories will be detected
- Privacy note explaining deletion of originals

#### Processing states

- Waiting
- Uploading
- Detecting items
- Preparing cutouts
- Ready for review
- Failed with retry action

The interface should allow the user to leave the screen while processing continues.

### 9.5 Detection review

#### Purpose

Let users quickly validate AI work before items enter the wardrobe.

#### Required UI

- Original-photo reference during review only
- Grid or list of extracted item cutouts
- Selection controls for confirming or excluding items
- Category field
- Color field
- Optional expandable details
- Confidence indicator only when action is needed
- Possible duplicate warning
- Edit-crop or extraction-boundary action
- “Add confirmed items to wardrobe” primary action

#### Behavior

- High-confidence items should require little interaction.
- Uncertain fields should be visually highlighted.
- Users should be able to confirm all high-confidence items at once.
- False detections should be removable without deleting the entire upload.
- Original images should be deleted after the review is completed or abandoned according to the privacy policy.

### 9.6 Wardrobe inventory

#### Required UI

- Visual item-card grid
- Search
- Category filters
- Color filters
- Season or weather filters
- Formality filters
- Availability filter
- Sort by recently added, recently worn, most worn, and least worn
- Item count
- Upload action
- Clear-filter action

#### Initial categories

- Tops
- Bottoms
- Skirts
- Dresses
- Jumpsuits and matching sets
- Outerwear
- Shoes
- Bags
- Jewelry
- Belts
- Hats
- Scarves
- Other accessories

#### Item card

Each card should show:

- Clean extracted item image
- Item name or generated description
- Category
- Primary color
- Availability state when relevant
- Favorite indicator

The card should remain visually focused on the clothing image. Metadata should not overwhelm the grid.

### 9.7 Wardrobe item detail

#### Required fields

- Extracted item image
- Editable name
- Category and subcategory
- Primary and secondary colors
- Pattern
- Material, when known
- Style or aesthetic tags
- Formality
- Season and weather suitability
- Warmth or layering value
- Fit or comfort notes
- Brand, if known
- Personal notes
- Availability
- Favorite status
- Date added
- Last worn date, when available
- Wear count, when available

#### Required actions

- Save changes
- Use this item in an outfit
- Mark available or unavailable
- Favorite
- Archive
- Delete

### 9.8 Conversational stylist

#### Purpose

Make outfit selection feel like a conversation with a capable personal stylist.

#### Layout

Use a two-pane desktop layout:

- Main pane: conversation, follow-up questions, and recommendations
- Context pane: detected constraints, weather, location, selected items, and active preferences

#### Prompt behavior

The user can begin with any request. The app should extract:

- Occasion
- Date and time
- Location
- Indoor or outdoor setting
- Dress code
- Desired aesthetic or mood
- Comfort requirements
- Weather needs
- Required items
- Excluded items or colors
- Practical activities such as walking

Missing nonessential details should not block a recommendation. The stylist should ask a follow-up only when the missing information could materially change the outfit.

#### Suggested prompt chips

- Casual day out
- Class or campus
- Date night
- Dinner
- Interview
- Party
- Work or internship
- Travel day

Prompt chips are accelerators, not substitutes for free-text input.

### 9.9 Outfit results

#### Required output

Show three ranked outfit options. Each option includes:

- Outfit title or short aesthetic label
- Images of every selected wardrobe item
- Complete item list
- Short explanation of why the combination works
- Occasion-fit explanation
- Weather-fit explanation
- Styling notes such as tucking, layering, or accessory placement
- Alternative owned items where useful

#### Outfit completeness

An outfit should normally include the clothing and footwear necessary to leave the house appropriately dressed. Add outerwear when weather or context requires it. Accessories may be included when they improve the result but should not be forced into every outfit.

#### Required actions

- Approve and save
- Replace an individual item
- Make more casual
- Make more formal
- Make warmer or cooler
- Try another color direction
- Regenerate the entire outfit
- Continue refining through chat

#### Visual presentation

Use a polished flat-lay-style composition or coordinated item collage built from the user's item cutouts. Do not imply that the outfit has been virtually tried on by the user. The design should make it obvious that every displayed item comes from the user's wardrobe.

### 9.10 Shopping suggestion

Shopping suggestions are optional and visually secondary to owned-item recommendations.

#### Display rules

- Never replace an owned item solely because a new purchase is trendier.
- Show a suggestion only when it fills a meaningful wardrobe gap or unlocks several combinations.
- Explain the value using the user's inventory.
- Keep the suggestion dismissible.
- Do not present retailer links or prices in the MVP.

Example:

> A fitted polka-dot top would work with four bottoms you already own and add a current pattern to your wardrobe.

The suggestion may include a generic visual reference, descriptive attributes, and compatible owned items. It must be clearly labeled as something the user does not currently own.

### 9.11 Saved outfits

#### Required UI

- Visual outfit grid
- Search
- Occasion and season filters
- Saved date
- Worn status
- Outfit-detail view

#### Required actions

- Mark as worn
- Edit or replace an item
- Ask for a similar outfit
- Remove from saved outfits

Saving or approving an outfit should strengthen the app's understanding of the user's style.

### 9.12 Settings and privacy

#### Sections

- Account details
- Style profile
- Clothing and comfort preferences
- Default location and weather permission
- Data and privacy
- Account deletion

#### Privacy controls

- Explain what data is retained after photo processing.
- Confirm that original photos are deleted.
- Allow deletion of individual wardrobe items and their extracted images.
- Allow permanent deletion of the account and all associated wardrobe data.

---

## 10. Recommendation behavior

### Hard constraints

Explicit user instructions must be satisfied whenever possible. Examples include:

- No heels
- Must include a particular item
- Do not use a particular color
- Needs to be suitable for rain
- Must match a stated dress code
- User cannot currently wear a specific item

### Soft preferences

The system should optimize for:

- Personal aesthetic
- Visual coordination
- Current style relevance
- Occasion appropriateness
- Weather suitability
- Comfort
- Variety
- Use of underworn wardrobe items

### Ranking priorities

1. Satisfy explicit constraints.
2. Ensure the outfit is complete and practical.
3. Fit the occasion and dress code.
4. Account for weather and location.
5. Match the user's learned personal style.
6. Produce an aesthetically coherent combination.
7. Add trend relevance where it complements the user's style.

### Insufficient wardrobe behavior

The app must not silently invent items or present an incomplete outfit. It should:

1. Construct the strongest complete outfit available using the closest owned alternatives.
2. Clearly explain any compromise.
3. Optionally identify one useful wardrobe gap as a separate shopping suggestion.

---

## 11. Personalization

### Explicit signals

- Onboarding aesthetic selections
- Written style description
- Favorite and avoided colors
- Comfort and modesty preferences
- User-entered item notes
- Direct conversational instructions

### Behavioral signals

- Approved and saved outfits
- Item replacements within a recommendation
- Outfits marked as worn
- Favorite wardrobe items

### MVP learning rule

Approved and saved outfits are the main signal. The application should state that saving outfits improves future recommendations.

The interface should not claim to have permanently learned a preference after a single action. Users must be able to edit their explicit style profile at any time.

---

## 12. Item extraction behavior

The extraction system should detect every clearly visible wearable item, including layered garments and accessories when possible.

### Common AI errors the UI must support correcting

- Missing a visible item
- Detecting a non-clothing object
- Combining two items into one
- Splitting one item into multiple pieces
- Assigning the wrong category
- Assigning the wrong color or pattern
- Creating a poor cutout
- Adding the same garment more than once

### Confidence handling

- Do not show technical probability values to ordinary users.
- Use human-readable states such as “Check category” or “Possible duplicate.”
- Automatically populate high-confidence metadata.
- Ask for confirmation only where uncertainty matters.

---

## 13. Weather and location

- Request current location only when it is useful for an outfit request.
- If permission is unavailable, ask the user to enter a city manually.
- Show the location and weather being used so the user can correct them.
- Consider temperature, precipitation, humidity, wind, and indoor/outdoor context when relevant.
- Do not block recommendations when weather data is unavailable; disclose that weather was not considered and ask for manual context if necessary.

---

## 14. Important system states

The designs must include, not merely imply, the following states:

- Brand-new user with no wardrobe
- Small or incomplete wardrobe
- Populated wardrobe
- Upload in progress
- Extraction in progress
- Partial extraction failure
- No garments detected
- Low-confidence item
- Possible duplicate
- Empty search or filter result
- Outfit generation in progress
- Missing essential request information
- Weather unavailable
- No ideal wardrobe match
- Recommendation error with retry
- Saved outfit success
- Offline or lost-connection state
- Destructive-action confirmation

Use skeletons or progress indicators for AI work. Avoid indefinite spinners without explanatory copy.

---

## 15. Visual and interaction direction

### Desired personality

- Stylish
- Chic
- Personal
- Confident
- Contemporary
- Editorial
- Minimal and calm rather than visually noisy

### Visual direction

Create a sleek, black-and-white editorial fashion experience with generous whitespace, strong garment imagery, and precise typography. It should feel like a contemporary fashion magazine translated into a personal digital closet: polished, aspirational, and highly usable. The interface must not resemble a conventional e-commerce catalog or a generic productivity dashboard.

#### Color system

- Black and white are the dominant interface colors across navigation, typography, backgrounds, controls, and structural elements.
- Use a crisp white or very subtle warm white as the main canvas and a rich near-black for text and high-emphasis surfaces.
- Let color come primarily from the user's garments, outfit cutouts, photography, illustrations, editorial graphics, weather artwork, and occasional status accents.
- Decorative color should feel intentional and art-directed. Use one strong accent moment at a time instead of introducing a large multicolor UI palette.
- The wardrobe and outfit imagery should remain the visual focus. Surrounding UI colors must not compete with the clothing.
- Functional states such as errors, success, selection, and warnings may use color, but must also include icons, text, or another non-color cue.

#### Typography

- Use a tall, refined editorial serif for page titles, hero statements, outfit names, and other high-impact display text.
- The display serif should have an elegant fashion-publication quality, with high contrast and a vertically elongated silhouette. A Didot-, Bodoni-, or modern editorial-style serif is an appropriate reference, but the final font must remain legible and properly licensed.
- Use a clean, modern sans serif for body copy, navigation, buttons, form labels, filters, metadata, and conversational text.
- Create deliberate contrast between expressive serif headings and highly readable sans-serif interface copy.
- Favor large titles, disciplined type scales, short line lengths, and generous leading. Avoid using the serif for small labels or dense information.

#### Imagery and graphic elements

- Treat extracted garments as editorial objects, using clean cutouts, deliberate scale, and generous breathing room.
- Outfit results may use composed flat lays, overlapping item cutouts, subtle shadows, or restrained collage treatments.
- Introduce color through selected graphic elements such as abstract shapes, cropped photography, line art, weather illustrations, category markers, or a single seasonal accent.
- Graphics should add energy and personality without making the product feel playful, childish, or busy.
- Use monochrome icons with a consistent, fine-line visual language.

#### Surfaces and components

- Prefer clean white space, fine black or gray rules, subtle tonal separation, and restrained shadows.
- Cards should feel like editorial frames rather than boxed marketplace listings.
- Primary buttons may use solid black with white text; secondary actions may use outlined or text treatments.
- Selected states can use inversion, a graphic accent, or a strong border while remaining consistent with the black-and-white system.
- Corner radius, shadows, and motion should be subtle and consistent. Avoid overly rounded, bubbly components.

Avoid:

- An overly pink or stereotypically feminine interface
- A juvenile “dress-up game” aesthetic
- Dense enterprise-dashboard styling
- A generic beige luxury aesthetic that weakens the requested black-and-white contrast
- Excessive gradients or glass effects
- Excessive use of colorful UI chrome
- Rounded bubble typography or casual display fonts
- Product cards that resemble a shopping catalog
- Making AI feel magical but unexplained

### Interaction principles

- Preserve the user's context during outfit revisions.
- Use direct manipulation where helpful, particularly for item replacement.
- Keep wardrobe images large enough to recognize quickly.
- Make primary actions obvious without filling every card with controls.
- Use progressive disclosure for detailed item metadata.
- Clearly distinguish owned wardrobe items from suggested purchases.

### Desktop canvas

Design primarily for common laptop and desktop widths, with a target layout around 1440 pixels wide. The UI should remain usable at approximately 1024 pixels wide. Mobile UI is not part of this MVP, but component decisions should not prevent later responsive adaptation.

---

## 16. Accessibility requirements

- Meet WCAG AA contrast expectations.
- All major flows must be keyboard accessible.
- Do not rely on color alone to communicate category, availability, warnings, or confidence.
- Provide visible focus states.
- Provide descriptive text alternatives for garment and outfit imagery.
- Use readable type sizes and scalable layouts.
- Respect reduced-motion preferences.
- Make upload, extraction, and generation progress understandable to assistive technologies.

---

## 17. Privacy requirements

- Original uploaded photos are temporary processing inputs and are deleted after extraction.
- Retained extracted item images must be disclosed to the user.
- Remove unnecessary image metadata, including location metadata, before storage.
- Personal images and wardrobe data must not be used to train shared models without explicit opt-in consent.
- Users can delete individual items and all associated retained data.
- Users can permanently delete their account and wardrobe.
- Destructive deletion actions require clear confirmation and must state that the action cannot be undone.

---

## 18. MVP feature priorities

### P0: Required for the first usable release

- Email-and-password authentication
- Style-preference onboarding
- Current or manually entered location
- Multi-image upload
- Automatic garment and accessory detection
- Individual item cutouts
- Detection review and correction
- Duplicate warning
- Editable wardrobe inventory
- Search, filtering, and sorting
- Natural-language stylist requests
- Follow-up questions for essential missing context
- Weather-aware recommendations
- Three complete outfit options
- Outfit explanations and styling notes
- Individual item replacement
- Full outfit regeneration
- Save or approve outfit
- Saved-outfit library
- Original-photo deletion
- Item and account deletion controls

### P1: Valuable immediately after MVP

- Inspiration-image onboarding
- Negative feedback and rejection reasons
- Wear history and wardrobe-use analytics
- Calendar or future-date outfit planning
- Direct product links for shopping suggestions
- More sophisticated live trend ingestion
- Sharing or exporting outfits
- Laundry and temporary availability states

### Explicitly outside the MVP

- Photorealistic virtual try-on
- Social feed or public profiles
- In-app shopping or checkout
- Exact retail-product recognition
- Body-shape scoring
- Automatic professional color analysis
- Packing lists
- Resale or donation marketplace
- Native mobile applications

---

## 19. Success measures

No formal business targets have been set yet. The MVP should instrument these product signals for later evaluation:

- Percentage of users who add at least ten wardrobe items
- Time from account creation to first confirmed item
- Time from account creation to first outfit recommendation
- Percentage of detected items accepted without edits
- Percentage of outfit sessions resulting in a saved or approved outfit
- Percentage of recommendations that are regenerated or heavily edited
- Weekly returning users
- Number of approved outfits per active user

### Initial north-star behavior

A user receives an outfit recommendation and approves or saves it because she would realistically wear it.

---

## 20. MVP acceptance criteria

The MVP is ready for user testing when:

1. A new user can create an account and reach the product without assistance.
2. A user can upload multiple photos from a desktop computer.
3. The app visibly tracks upload and extraction progress.
4. Clearly visible garments and accessories are presented as individual reviewable items.
5. The user can remove false detections and correct core item information.
6. Confirmed items appear in a searchable and filterable wardrobe.
7. The user can modify or delete any wardrobe item.
8. The original uploaded photo is deleted after extraction while confirmed item cutouts remain.
9. The user can describe an occasion or constraint in free text.
10. The stylist asks for missing information only when needed.
11. The app displays the location and weather context used.
12. The app returns three complete outfit choices from active wardrobe items.
13. Every outfit includes an explanation and practical styling guidance.
14. The user can replace one item without unnecessarily discarding the rest of the outfit.
15. The user can save or approve an outfit.
16. Saved outfits appear in a dedicated library and contribute to personalization.
17. Shopping suggestions, when shown, are visibly separate from owned-item recommendations.
18. Empty, loading, failure, and insufficient-wardrobe states are all designed.

---

## 21. Design deliverables requested from Claude Design

Create a cohesive desktop UI system and high-fidelity screens for the complete MVP. The output should include:

1. Welcome and authentication
2. Style-preference onboarding
3. Empty home dashboard
4. Populated home dashboard
5. Photo-upload modal or page
6. Upload and extraction progress
7. Detection-review screen
8. Duplicate and low-confidence states
9. Wardrobe inventory
10. Wardrobe filtering and search
11. Wardrobe item detail and editing
12. Empty conversational stylist
13. Stylist follow-up question
14. Outfit-generation loading state
15. Three-option outfit-results view
16. Single-outfit detail and explanation
17. Item-replacement interaction
18. Insufficient-wardrobe compromise and shopping suggestion
19. Saved-outfit library
20. Settings, style profile, location, privacy, and account deletion
21. Relevant empty, error, and confirmation states

Also define:

- Desktop navigation behavior
- A black-and-white color system with controlled graphic accents
- A paired typography system using a tall editorial serif for display text and a sleek sans serif for interface copy
- Spacing, elevation, border, radius, iconography, and motion tokens
- Button, input, card, chip, filter, modal, toast, and progress components
- Garment-card and outfit-card variants
- Interaction notes for AI loading, follow-up questions, item replacement, and saving
- Accessibility annotations for focus, contrast, keyboard behavior, and non-color status cues

The final design should prioritize the upload-to-wardrobe-to-outfit journey. Shopping should remain a minor supporting feature rather than the visual center of the product.
