# Documentation complète — TaskFlow

Dernière mise à jour: 2026-06-06

Table des matières
- Introduction
- Aperçu du projet
- Prérequis
- Installation & exécution
- Structure du projet
- Architecture et notions clés
- Fichiers et dossiers importants
- Modèles de données
- Services principaux
- Composants importants
- Gabarits et styles
- Gardes et routage
- Notifications
- Base de données (fichier `db.json`)
- Tests
- Déploiement
- Contribution et style de code
- Evolution suggérée
- Annexes (liens vers fichiers)

---

## Introduction
Ce document décrit le projet TaskFlow — une application de gestion de tâches avec tableaux Kanban, gestion de projets, notifications et authentification. Il vise à fournir une documentation "prête à l'emploi" pour développeurs et intervenants (setup, architecture, extension, déploiement).

## Aperçu du projet
- Nom: TaskFlow
- Objectif: permettre aux équipes de créer des projets, gérer des tâches en Kanban, inviter des membres, et recevoir des notifications.
- Stack: Angular (TypeScript) front-end, code serveur minimal (fichiers `server.ts`, `main.server.ts`) pour rendu côté serveur / APIs locales selon configuration.

## Prérequis
- Node.js >= 16
- npm ou pnpm (le dépôt contient `pnpm-lock.yaml` mais `package.json` fonctionne avec npm)
- Git

## Installation & exécution
1. Cloner le repo

```bash
git clone <repo-url>
cd Angular-TaskFlow
```

2. Installer dépendances

```bash
npm install
# ou pnpm install
```

3. Lancer le serveur de développement

```bash
npm start
```

4. Tests

```bash
npm test
```

## Structure du projet (vue globale)
- `src/` : application Angular
  - `main.ts`, `main.server.ts`, `server.ts` : points d'entrée client & server
  - `app/` : code applicatif (services, composants, guards, models)
    - `components/` : écrans et composants réutilisables (kanban, projects, login, profile...)
    - `services/` : logique métier côté client (auth, notifications, project, task)
    - `guards/` : `auth.guard.ts`, `guest.guard.ts`
    - `app.ts`, `app.routes.ts` : configuration de l'application
- `public/` : ressources publiques
- `db.json` : données factices (utilisées par la couche services pour mocks)
- `package.json` : scripts et dépendances

## Architecture et notions clés
- L'application est organisée en composants Angular classiques. Les services gèrent l'accès aux données via `db.json` ou via clients HTTP (selon configuration).
- Header + notifications apparaissent dans l'entête des pages; idéalement transformés en composant partagé pour éviter duplication.

## Fichiers et dossiers importants
- [package.json](package.json)
- [angular.json](angular.json)
- [src/main.ts](src/main.ts)
- [src/main.server.ts](src/main.server.ts)
- [src/server.ts](src/server.ts)
- [src/app/app.ts](src/app/app.ts)
- [src/app/app.routes.ts](src/app/app.routes.ts)
- [src/app/components/kanban/kanban.component.html](src/app/components/kanban/kanban.component.html)
- [src/app/components/kanban/kanban.component.css](src/app/components/kanban/kanban.component.css)
- [src/app/components/projects/projects.component.html](src/app/components/projects/projects.component.html)
- [src/app/components/projects/projects.component.css](src/app/components/projects/projects.component.css)
- Services: [src/app/services/auth.service.ts](src/app/services/auth.service.ts), [src/app/services/notification.service.ts](src/app/services/notification.service.ts), [src/app/services/project.service.ts](src/app/services/project.service.ts), [src/app/services/task.service.ts](src/app/services/task.service.ts)
- Models: [src/app/project.model.ts](src/app/project.model.ts), [src/app/task.model.ts](src/app/task.model.ts), [src/app/user.model.ts](src/app/user.model.ts)

## Modèles de données (résumé)
Les modèles se trouvent dans `src/app/*.model.ts`. Exemple de champs attendus (vérifier dans les fichiers pour les détails exacts):
- Project: `id`, `name`, `description`, `members`, `createdAt`
- Task: `id`, `title`, `description`, `priority`, `status`, `assigneeId`, `dueDate`, `createdAt`
- User: `id`, `name`, `email`, `role`

Voir les définitions: [src/app/project.model.ts](src/app/project.model.ts), [src/app/task.model.ts](src/app/task.model.ts), [src/app/user.model.ts](src/app/user.model.ts)

## Services principaux
- `AuthService` (`src/app/services/auth.service.ts`)
  - Gère l'authentification, l'état utilisateur courant, login/logout.
- `ProjectService` (`src/app/services/project.service.ts`)
  - CRUD projets, gestion des membres, envoie des notifications lors d'invitations.
- `TaskService` (`src/app/services/task.service.ts`)
  - CRUD tâches, filtre par status/priorité, drag & drop sur Kanban.
- `NotificationService` (`src/app/services/notification.service.ts`)
  - Ajout, lecture, marquage comme lu, récupération des notifications par utilisateur.

Pour les signatures exactes et méthodes disponibles, consultez directement:
- [src/app/services/auth.service.ts](src/app/services/auth.service.ts)
- [src/app/services/project.service.ts](src/app/services/project.service.ts)
- [src/app/services/task.service.ts](src/app/services/task.service.ts)
- [src/app/services/notification.service.ts](src/app/services/notification.service.ts)

## Composants importants
- `Kanban` ([src/app/components/kanban/kanban.component.*]) : écriture principale pour le tableau Kanban
- `Projects` ([src/app/components/projects/*]) : listing de projets et header
- `Login`, `Register`, `Profile` : gestion utilisateur

Chaque composant possède son template `.html`, sa logique `.ts`, et ses styles `.css`.

## Gabarits et styles
- Les styles sont locaux aux composants (fichiers `.css` dans chaque dossier de composant). Pour thèmes globaux, vérifier `src/styles.css` ou `app.css`.
- Notes: certaines règles peuvent être dupliquées entre composants; envisager centralisation ou composants partagés.

## Gardes & Routing
- `auth.guard.ts` protège les routes nécessitant authentification.
- `guest.guard.ts` protège les routes accessibles aux visiteurs.
- Voir configuration: [src/app/app.routes.ts](src/app/app.routes.ts)

## Notifications
- Le code de notification apparaît dans l'entête de `projects` et `kanban`.
- Recommandation technique: extraire l'entête + dropdown notifications dans un composant réutilisable `Header` ou `Notifications` pour garantir l'uniformité et éviter divergences (ce que vous avez rencontré).

## Base de données (mock)
- `db.json` contient des données factices utilisables par les services en mode mock. Vérifier schéma pour adapter les fixtures.

## Tests
- Scripts de test dans `package.json`.
- Tester les services (unit tests) et l'intégration du Kanban (drag/drop) est recommandé.

## Déploiement
- Build prod: `npm run build` (vérifier `package.json` pour script exact)
- Déploiement dépend de l'infra: static hosting pour le front, ou Node server si SSR via `server.ts`.

## Contribution
- Style: TypeScript strict, éviter duplication, préférer composants partagés pour header/notifications.
- Créer des PRs, ajouter descriptions et étapes pour reproduire bugs.

## Evolution suggérée
- Extraire `Header/Notifications` en composant unique et l'utiliser sur toutes les pages.
- Ajouter tests unitaires pour `NotificationService`.
- Ajouter CI (GitHub Actions) pour lint/tests/build.

## Annexes (liens rapides)
- Header Kanban: [src/app/components/kanban/kanban.component.html](src/app/components/kanban/kanban.component.html#L1)
- Styles Kanban: [src/app/components/kanban/kanban.component.css](src/app/components/kanban/kanban.component.css#L1)
- Header Projects: [src/app/components/projects/projects.component.html](src/app/components/projects/projects.component.html#L1)
- Styles Projects: [src/app/components/projects/projects.component.css](src/app/components/projects/projects.component.css#L1)
- Notification service: [src/app/services/notification.service.ts](src/app/services/notification.service.ts#L1)

---

Si vous voulez, je peux:
- Générer une doc détaillée par composant (fichiers `docs/components/*.md`) listant les méthodes publiques, inputs/outputs et events.
- Créer un composant partagé `Header/Notifications` et remplacer les entêtes dupliqués automatiquement.
- Lancer une vérification visuelle et fournir captures d'écran après `npm start`.

Dites-moi quelle suite vous préférez : créer la doc complète par composant, ou passer directement au refactor `Header/Notifications` ?
