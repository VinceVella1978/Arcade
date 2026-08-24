# POINT — jeu mobile (iOS / Android / PWA)

Jeu d'esquive minimaliste : un motif vivant dessiné par une formule mathématique
mutable tourne autour de vous. Esquivez les brins bleus, récoltez les carrés
ambérés, et réécrivez la formule qui vous traque.

Basé sur le prototype `point-jeu.html` — même moteur, même formule, packaging complet en plus.

## Structure

```
www/            jeu web unique (index.html + manifest + sw.js) — source de vérité
tools/          génération d'icônes PNG en Node pur (zlib, aucun dépendance graphique)
assets/         sources 1024px pour @capacitor/assets
ios/            projet natif Capacitor (Xcode)
android/        projet natif Capacitor (Android Studio)
```

## Jouer tout de suite (PWA)

```bash
npm run serve            # http://localhost:3000
```

Sur téléphone : `menu → installer l'application` (Android) ou
`partager → sur l'écran d'accueil` (iOS). Le service worker rend le jeu
100 % hors-ligne après la première visite.

## Compiler les apps natives

Prérequis : Xcode (+ CocoaPods si demandé) pour iOS, Android Studio (SDK 35)
pour Android. Les projets sont déjà générés et synchronisés (`npx cap sync`
est relancé automatiquement à chaque modification de `www/`).

```bash
npm run open:ios         # puis ▶ dans Xcode (simulateur ou device)
npm run open:android     # puis ▶ dans Android Studio

# ou en ligne de commande, device branché :
npm run run:ios
npm run run:android
```

Avant App Store / Play Store : changer `appId` dans `capacitor.config.json`
(`com.vincentvella.point`) et le bundle identifier dans Xcode.

## Régénérer icônes et splash

```bash
npm run icons            # www/icons/* + assets/icon-only.png + assets/splash.png
npm run assets           # décline vers ios/ android/ (nécessite npx @capacitor/assets)
```

## Le jeu en bref

- **Pilotage** : tap = destination, glisser = guidage continu. Le vaisseau est
  un ressort amorti (ζ ≈ 0,7) : il garde un peu d'élan à l'arrivée.
- **Boucle** : chaque vague (18 s) active un brin bleu de plus ou accélère le motif.
- **Bonus** : 3 carrés ambrés → hexagone vert → choix parmi 3 patches.
  Chaque patch mute une constante de la formule (calme = survie,
  risqué = multiplicateur de score). Vignettes précalculées pour voir l'après.
- **La formule** : visible en jeu (bouton « formule »), copiable à la fin.
