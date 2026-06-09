# Documentation des fonctionnalités — TaskFlow

Dernière mise à jour: 2026-06-06

Objectif: fournir une description complète de chaque fonctionnalité, son emplacement dans le code, son comportement attendu, les points d'extension et les tests recommandés.

Table des matières
- Authentification et gestion utilisateur
- Projets (CRUD, membres, invitations)
- Tâches (CRUD, Kanban, drag & drop)
- Filtres et recherche
- Notifications
- Profil utilisateur
- Guards et routage
- Mock data & persistence (db.json)
- API / server-side (fichiers server)
- Tests et vérifications
- Extensions et recommandations

---

**Remarque**: les chemins donnés sont relatifs au repo. Ouvrez les fichiers référencés pour voir les implémentations exactes.

## 1. Authentification et gestion utilisateur
But: permettre aux utilisateurs de s'authentifier, maintenir une session et exposer `currentUser` aux composants.
Fichiers clés:
- `src/app/services/auth.service.ts` — login, logout, current user, stockage local.
- `src/app/components/login/*` — formulaire de connexion et logique UI.
Comportement:
- `login(email, password)` valide les identifiants (mock ou API), stocke token/infos utilisateur et met à jour l'état.
- `logout()` efface l'état et redirige vers la page de connexion.
Points d'extension:
- Intégrer OAuth ou JWT réel côté serveur.
- Ajouter rafraichissement de token et gestion des erreurs réseau.
Tests recommandés:
- Unit tests pour `AuthService` (login success/fail, persistence localStorage).
- E2E: tentative d'accès à une route protégée redirige vers login.

## 2. Projets (CRUD, membres, invitations)
But: créer/éditer/supprimer projets, gérer membres, envoyer invitations.
Fichiers clés:
- `src/app/services/project.service.ts` — création, lecture, modification, suppression, invitations.
- `src/app/components/projects/*` — UI liste, création, édition.
- `src/app/project.model.ts` — schéma du modèle.
Comportement:
- CRUD sur projets: forms pour créer/mettre à jour.
- Ajouter membre: `invite` appelle `projectService` qui à son tour ajoute notification via `NotificationService`.
- Les invitations créent une notification ciblée; le membre invité apparaît dans `project.members` une fois accepté.
Points d'extension:
- Workflow d'acceptation d'invitation côté utilisateur.
- Permissions par rôle (owner, collaborator, viewer).
Tests recommandés:
- Unit tests pour les méthodes d'invitation (vérifier que `NotificationService.addNotification` est appelé).
- Test intégration: création d'un projet, ajout d'un membre, puis affichage dans l'UI.

## 3. Tâches (CRUD, Kanban, drag & drop)
But: gérer les tâches par projet, afficher en colonnes Kanban, permettre drag & drop pour changer le statut.
Fichiers clés:
- `src/app/services/task.service.ts` — CRUD pour tâches, filtrage.
- `src/app/components/kanban/*` — template, logique drag/drop, filtres.
- `src/app/task.model.ts` — schéma du modèle (id, title, description, priority, status, assigneeId, dueDate).
Comportement:
- Statuts standards: `todo`, `in-progress`, `done`.
- Drag & drop: lors du drop, `task.service.update` met à jour le statut et persiste (mock `db.json` ou API).
- Création/édition via modal; suppression et marquage terminé.
Points d'extension:
- Sauvegarde optimiste vs confirmation serveur.
- Historique des changements / activités par tâche.
Tests recommandés:
- Unit tests: logique de déplacement de tâche (calcul des nouvelles colonnes, update payload).
- E2E: glisser-déposer d'une tâche et vérifier le nouveau statut.

## 4. Filtres et recherche
But: filtrer les tâches par priorité, assignee, texte.
Fichiers clés:
- `src/app/components/kanban/kanban.component.html`/`.ts` — UI pour `pill-filter` et `select-filter`.
Comportement:
- `selectedPriority()` et `selectedAssignee()` contrôlent ce qui est affiché.
- `clearFilters()` réinitialise.
Points d'extension:
- Sauvegarder préférences utilisateur (localStorage).
- Ajouter recherche texte et tri.
Tests recommandés:
- Unit tests pour fonctions de filtrage.

## 5. Notifications
But: alerter les utilisateurs d'événements (invitation, assignation, commentaire, etc.).
Fichiers clés:
- `src/app/services/notification.service.ts` — ajout, lecture, getByUser, markAsRead.
- `src/app/components/projects/projects.component.html` — header notifications (design de référence).
- `src/app/components/kanban/kanban.component.html` — header notifications (doit être identique au référence).
Comportement:
- `addNotification(userId, title, message, meta?)` ajoute une entrée.
- `getNotificationsForUser(userId)` retourne la liste (avec champ `read`).
- Actions UI: marquer une notification, marquer tout lu.
Points d'extension:
- Push en temps réel (WebSocket) pour nouvelles notifications.
- Stockage côté serveur et pagination.
Tests recommandés:
- Unit tests pour le service (ajout, read/unread, markAllRead).
- UI test: ouvrir dropdown, marquer un item, vérification visuelle et état persistant.

## 6. Profil utilisateur
But: permettre à l'utilisateur d'éditer son profil et voir ses informations.
Fichiers clés:
- `src/app/components/profile/*` — template et styles.
- `src/app/services/auth.service.ts` — mise à jour de l'utilisateur.
Comportement/extension:
- Modifier nom, email, avatar.
- Ajouter upload d'avatar et validation côté serveur.
Tests recommandés:
- Unit tests du composant profile (form validation).

## 7. Guards et routage
But: protéger les routes et contrôler l'accès.
Fichiers clés:
- `src/app/guards/auth.guard.ts`
- `src/app/guards/guest.guard.ts`
- `src/app/app.routes.ts`
Comportement:
- `auth.guard` redirige vers login si non authentifié.
- `guest.guard` empêche l'accès aux routes auth quand connecté.
Tests recommandés:
- Integration tests pour routage et guards.

## 8. Mock data & persistence (db.json)
But: fournir des fixtures locales pour développement.
Fichiers clés:
- `db.json` — jeux de données pour users, projects, tasks, notifications.
Utilisation:
- Les services peuvent lire/écrire sur ce fichier en mode dev, ou utiliser un petit serveur mock (json-server, ou implémentation custom).
Points d'extension:
- Remplacer par API REST réelle ou service GraphQL.

## 9. API / server-side
Fichiers clés:
- `src/server.ts`, `src/main.server.ts` — pour SSR ou endpoints minimalistes.
Comportement:
- Actuellement utilisé pour rendu et/ou endpoints locaux. Vérifier si `server.ts` expose routes API pour CRUD; si non, prévoir un backend dédié.

## 10. Tests et vérifications
Scripts:
- `npm test` (voir `package.json`).
Recommandations:
- Ajouter unit tests pour `NotificationService`, `ProjectService`, `TaskService`.
- Ajouter tests E2E (Cypress / Playwright) pour flux principaux: login -> création projet -> création tâche -> drag/drop -> notification.

## 11. Extensions et recommandations techniques
- Extraire `Header` et `Notifications` en composant partagé:
  - `src/app/components/header/header.component.{ts,html,css}`
  - `src/app/components/notifications/notifications.component.{ts,html,css}`
  - Remplacer les entêtes dupliqués par `<app-header>`.
- Centraliser styles partagés (couleurs, variables) dans `src/styles.css` ou un fichier `variables.css`.
- Ajouter CI: tests, lint, build.
- Ajouter documentation automatique par composant (script qui scanne `src/app/components` et génère `docs/components/<component>.md`).

---

## Annexes: mapping rapide fonctionnalités → fichiers
- Auth: `src/app/services/auth.service.ts`, `src/app/components/login/*`
- Projects: `src/app/services/project.service.ts`, `src/app/components/projects/*`
- Tasks/Kanban: `src/app/services/task.service.ts`, `src/app/components/kanban/*`
- Notifications: `src/app/services/notification.service.ts`, `src/app/components/*` (header)
- Models: `src/app/project.model.ts`, `src/app/task.model.ts`, `src/app/user.model.ts`

---

Prochaines actions disponibles (choisissez une):
- Je génère automatiquement des fiches par composant (`docs/components/*.md`) listant inputs/outputs, méthodes publiques, events et exemples d'utilisation.
- Je refactorise le header et notifications en composants partagés et remplace les entêtes dupliqués.
- Je crée une page d'index/docs (table des matières) et lie tous les documents générés.

Quelle action voulez-vous que j'exécute en suivant ?
