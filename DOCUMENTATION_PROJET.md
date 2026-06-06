# Documentation Technique - TaskFlow Angular

## Table des matières
1. [Architecture Générale](#architecture-générale)
2. [Authentification (Login/Register)](#authentification-loginregister)
3. [Gestion des Projets](#gestion-des-projets)
4. [Gestion des Tâches](#gestion-des-tâches)
5. [Rôles et Permissions](#rôles-et-permissions)
6. [Pipeline des Données](#pipeline-des-données)

---

## Architecture Générale

### Stack Technique
- **Framework**: Angular 21.2.0 (Standalone Components)
- **Backend Simulé**: json-server (port 3000)
- **Styling**: TailwindCSS 4.1.12
- **HTTP**: Angular HttpClient avec proxy configuration
- **State Management**: Angular Signals
- **Routing**: Angular Router avec Guards

### Structure du Projet
```
src/app/
├── components/
│   ├── login/          # Page de connexion
│   ├── register/       # Page d'inscription
│   ├── projects/       # Liste et gestion des projets
│   └── kanban/         # Tableau Kanban des tâches
├── services/
│   ├── auth.service.ts # Gestion de l'authentification
│   └── project.service.ts # Gestion des projets et membres
├── guards/
│   ├── auth.guard.ts   # Protection des routes authentifiées
│   └── guest.guard.ts  # Protection des routes publiques
├── models/
│   ├── user.model.ts   # Interface User
│   ├── project.model.ts # Interfaces Project et ProjectMember
│   └── task.model.ts   # Interface Task
├── app.routes.ts       # Configuration des routes
└── app.config.ts       # Configuration de l'application
```

### Fichiers de Configuration
- **`start.js`**: Script de démarrage qui lance json-server et Angular en parallèle
- **`db.json`**: Base de données JSON simulée (users, projects, projectMembers, tasks)
- **`proxy.conf.json`**: Configuration du proxy Angular pour rediriger `/api` vers json-server

---

## Authentification (Login/Register)

### Fichiers Concernés
- **`src/app/services/auth.service.ts`**: Service d'authentification
- **`src/app/components/login/login.component.ts`**: Composant de connexion
- **`src/app/components/login/login.component.html`**: Template de connexion
- **`src/app/components/register/register.component.ts`**: Composant d'inscription
- **`src/app/components/register/register.component.html`**: Template d'inscription
- **`src/app/guards/auth.guard.ts`**: Guard pour routes protégées
- **`src/app/guards/guest.guard.ts`**: Guard pour routes publiques
- **`src/app/user.model.ts`**: Modèle User

### Pipeline Login

1. **Utilisateur soumet le formulaire** (`login.component.ts`)
   - Validation: email requis et valide, password requis (min 6 caractères)
   - Appel de `authService.login(email, password)`

2. **AuthService.login()** (`auth.service.ts`)
   ```
   GET /api/users?email={email}
   ```
   - Recherche l'utilisateur par email dans db.json
   - Si utilisateur non trouvé → erreur "Utilisateur non trouvé"
   - Si password incorrect → erreur "Mot de passe incorrect"
   - Si succès → `saveSession(user)` et retourne l'utilisateur

3. **Sauvegarde de session** (`auth.service.ts`)
   - Stocke l'utilisateur dans `localStorage` sous la clé `taskflow_user`
   - Met à jour le signal `_currentUser`
   - Le computed `isLoggedIn` devient true

4. **Redirection**
   - Navigation vers `/kanban` (ou `/projects` selon la route configurée)

### Pipeline Register

1. **Utilisateur soumet le formulaire** (`register.component.ts`)
   - Validation: 
     - name requis (min 2 caractères)
     - email requis et valide
     - password requis (min 6 caractères)
     - confirmPassword requis et doit correspondre à password
   - Appel de `authService.register(name, email, password)`

2. **AuthService.register()** (`auth.service.ts`)
   ```
   GET /api/users?email={email}
   ```
   - Vérifie si l'email est déjà utilisé
   - Si email existe → erreur "Cet email est déjà utilisé"
   
   ```
   POST /api/users
   Body: { name, email, password }
   ```
   - Crée le nouvel utilisateur dans db.json
   - Si succès → `saveSession(user)` et retourne l'utilisateur

3. **Sauvegarde de session**
   - Identique au login

4. **Redirection**
   - Navigation vers `/kanban`

### Guards

**auth.guard.ts**: Protège les routes `/projects` et `/projects/:projectId/kanban`
- Vérifie `authService.isLoggedIn()`
- Si false → redirection vers `/login`

**guest.guard.ts**: Protège les routes `/login` et `/register`
- Vérifie `!authService.isLoggedIn()`
- Si false → redirection vers `/projects`

### Session Persistence
- Au chargement de l'application, `AuthService` charge la session depuis `localStorage`
- Permet de maintenir la connexion après rafraîchissement de la page

---

## Gestion des Projets

### Fichiers Concernés
- **`src/app/services/project.service.ts`**: Service de gestion des projets
- **`src/app/components/projects/projects.component.ts`**: Composant principal
- **`src/app/components/projects/projects.component.html`**: Template
- **`src/app/project.model.ts`**: Modèles Project et ProjectMember

### Modèles de Données

**Project**:
```typescript
interface Project {
  id: number;
  name: string;
  description?: string;
  ownerId: number;  // ID du créateur
}
```

**ProjectMember**:
```typescript
interface ProjectMember {
  id: number;
  projectId: number;
  userId: number;
  role: 'Owner' | 'Admin' | 'Collaborator' | 'Viewer';
  userName?: string;  // Propriété UI (populée dynamiquement)
  userEmail?: string; // Propriété UI (populée dynamiquement)
}
```

### Pipeline: Chargement des Projets

1. **OnInit du composant** (`projects.component.ts`)
   - Appel de `loadProjects()`

2. **ProjectService.getProjectsForUser(userId)** (`project.service.ts`)
   ```
   GET /api/projectMembers?userId={userId}
   ```
   - Récupère toutes les memberships de l'utilisateur
   
   - Pour chaque membership:
     ```
     GET /api/projects/{projectId}
     ```
     - Récupère les détails du projet
     - Gère les erreurs (projets supprimés)
   
   - Retourne la liste des projets filtrés

3. **Affichage**
   - Les projets sont affichés dans une grille
   - Badge "Propriétaire" ou "Membre" selon `isOwner(project)`

### Pipeline: Création de Projet

1. **Utilisateur clique "Nouveau Projet"**
   - Ouverture du modal de création

2. **Soumission du formulaire** (`projects.component.ts`)
   - Validation: name requis (min 3 caractères), description (max 500 caractères)
   - Appel de `projectService.createProject(name, description, user.id)`

3. **ProjectService.createProject()** (`project.service.ts`)
   ```
   POST /api/projects
   Body: { name, description, ownerId }
   ```
   - Crée le projet dans db.json
   
   ```
   POST /api/projectMembers
   Body: { projectId, userId, role: 'Owner' }
   ```
   - Ajoute automatiquement le créateur comme Owner du projet
   
   - Retourne le projet créé

4. **Rafraîchissement**
   - Rechargement de la liste des projets
   - Fermeture du modal

### Pipeline: Modification de Projet

1. **Utilisateur clique sur le bouton "Modifier"** (seulement Owner)
   - Ouverture du modal d'édition avec les données pré-remplies

2. **Soumission du formulaire**
   - Appel de `projectService.updateProject(id, name, description)`

3. **ProjectService.updateProject()**
   ```
   PATCH /api/projects/{id}
   Body: { name, description }
   ```
   - Met à jour le projet dans db.json

4. **Rafraîchissement**
   - Rechargement de la liste des projets

### Pipeline: Suppression de Projet

1. **Utilisateur clique sur "Supprimer"** (seulement Owner)
   - Confirmation de suppression

2. **ProjectService.deleteProject(id)**
   ```
   DELETE /api/projects/{id}
   ```
   - Supprime le projet
   
   ```
   GET /api/projectMembers?projectId={id}
   ```
   - Récupère tous les membres du projet
   
   - Pour chaque membre:
     ```
     DELETE /api/projectMembers/{memberId}
     ```
     - Supprime le membership
   
   - Note: Les tâches ne sont pas supprimées en cascade (limitation de json-server)

3. **Rafraîchissement**
   - Rechargement de la liste des projets

### Pipeline: Gestion des Membres

#### Ajout d'un Membre

1. **Owner ouvre le modal "Membres"**
   - Affichage du formulaire d'invitation (seulement Owner)

2. **Owner entre l'email et sélectionne le rôle**
   - Rôles disponibles: Admin, Collaborator, Viewer

3. **ProjectService.addMemberByEmail(projectId, email, role)**
   ```
   GET /api/users?email={email}
   ```
   - Recherche l'utilisateur par email
   - Si non trouvé → erreur "Utilisateur non trouvé"
   
   ```
   GET /api/projectMembers?projectId={projectId}&userId={userId}
   ```
   - Vérifie si l'utilisateur est déjà membre
   - Si déjà membre → erreur "Cet utilisateur fait déjà partie du projet"
   
   ```
   POST /api/projectMembers
   Body: { projectId, userId, role }
   ```
   - Crée le membership
   - Popule `userName` et `userEmail` pour l'affichage

4. **Rafraîchissement**
   - Rechargement de la liste des membres

#### Modification de Rôle

1. **Owner change le rôle via dropdown** (seulement pour non-Owner)
   - Rôles disponibles: Admin, Collaborator, Viewer

2. **ProjectService.updateMemberRole(memberId, role)**
   ```
   PATCH /api/projectMembers/{memberId}
   Body: { role }
   ```
   - Met à jour le rôle du membre

3. **Rafraîchissement**
   - Rechargement de la liste des membres

#### Suppression de Membre

1. **Owner clique sur le bouton "×"** (seulement pour non-Owner)
   - Confirmation de suppression

2. **ProjectService.removeMember(memberId)**
   ```
   DELETE /api/projectMembers/{memberId}
   ```
   - Supprime le membership

3. **Rafraîchissement**
   - Rechargement de la liste des membres

#### Chargement des Membres

1. **Ouverture du modal "Membres"**
   - Appel de `loadMembers(projectId)`

2. **ProjectService.getProjectMembers(projectId)**
   ```
   GET /api/projectMembers?projectId={projectId}
   ```
   - Récupère tous les memberships du projet
   
   - Pour chaque membre:
     ```
     GET /api/users/{userId}
     ```
     - Récupère les détails de l'utilisateur
     - Popule `userName` et `userEmail`
   
   - Retourne la liste des membres avec leurs détails

---

## Gestion des Tâches

### Fichiers Concernés
- **`src/app/components/kanban/kanban.component.ts`**: Composant Kanban
- **`src/app/components/kanban/kanban.component.html`**: Template
- **`src/app/task.model.ts`**: Modèle Task
- **`db.json`**: Données des tâches

### Modèle de Données

**Task**:
```typescript
interface Task {
  id: number;
  projectId?: number;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done';
  assigneeId?: number;  // ID du user assigné
  createdAt?: string;
  updatedAt?: string;
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
}
```

### Pipeline: Chargement des Tâches

1. **Navigation vers `/projects/:projectId/kanban`**
   - `authGuard` vérifie l'authentification

2. **OnInit du composant Kanban** (`kanban.component.ts`)
   - Extraction du `projectId` depuis les paramètres de route
   - Appels parallèles:
     - `fetchProjectDetails(pId)`
     - `fetchUserRole(pId)`
     - `fetchTasks(pId)`

3. **fetchProjectDetails(pId)**
   ```
   GET /api/projects/{pId}
   ```
   - Récupère les détails du projet
   - Stocke dans le signal `project`

4. **fetchUserRole(pId)**
   - Récupère l'utilisateur courant via `authService.currentUser()`
   ```
   GET /api/projectMembers?projectId={pId}&userId={userId}
   ```
   - Récupère le membership de l'utilisateur
   - Stocke le rôle dans le signal `userRole`

5. **fetchTasks(pId)**
   ```
   GET /api/tasks?projectId={pId}
   ```
   - Récupère toutes les tâches du projet
   - Stocke dans le signal `tasks`

6. **Affichage**
   - Les tâches sont filtrées en 3 colonnes via computed signals:
     - `todoTasks()`: tâches avec status 'todo'
     - `inProgressTasks()`: tâches avec status 'in-progress'
     - `doneTasks()`: tâches avec status 'done'

### État Actuel de l'Implémentation

**Fonctionnalités Implémentées:**
- ✅ Affichage des tâches en tableau Kanban (3 colonnes)
- ✅ Filtrage par statut (todo, in-progress, done)
- ✅ Affichage des détails de tâche (titre, description, priorité, date d'échéance)
- ✅ Détection du rôle de l'utilisateur dans le projet
- ✅ Propriété `canEdit` basée sur le rôle (Owner, Admin, Collaborator = true; Viewer = false)

**Fonnalités Manquantes (À Implémenter):**
- ❌ Création de tâche
- ❌ Modification de tâche
- ❌ Suppression de tâche
- ❌ Changement de statut via dropdown
- ❌ Assignation de tâche à un membre (Owner uniquement)
- ❌ Modification de la priorité
- ❌ Drag & Drop entre colonnes

### Permissions par Rôle

**Owner:**
- Peut créer des tâches
- Peut modifier toutes les tâches
- Peut supprimer toutes les tâches
- Peut assigner des tâches à n'importe quel membre
- Peut changer le statut de toutes les tâches

**Admin:**
- Peut créer des tâches
- Peut modifier toutes les tâches
- Peut supprimer toutes les tâches
- Peut assigner des tâches (selon règles métier)
- Peut changer le statut de toutes les tâches

**Collaborator:**
- Peut créer des tâches
- Peut modifier ses propres tâches
- Peut supprimer ses propres tâches
- Peut changer le statut des tâches (via dropdown)
- Ne peut pas assigner de tâches

**Viewer:**
- Peut uniquement voir les tâches
- Ne peut pas créer, modifier ou supprimer
- Ne peut pas changer le statut
- Ne peut pas assigner de tâches

---

## Rôles et Permissions

### Hiérarchie des Rôles

1. **Owner** (Propriétaire)
   - Créateur du projet
   - Permissions maximales
   - Ne peut pas être retiré du projet
   - Son rôle ne peut pas être modifié

2. **Admin** (Administrateur)
   - Permissions élevées mais inférieures à Owner
   - Peut gérer les membres (sauf Owner)
   - Peut modifier/supprimer toutes les tâches

3. **Collaborator** (Collaborateur)
   - Peut contribuer activement
   - Peut créer et modifier ses propres tâches
   - Peut changer le statut des tâches

4. **Viewer** (Spectateur)
   - Accès en lecture seule
   - Peut voir les projets et tâches
   - Aucune permission d'écriture

### Matrice des Permissions

| Action | Owner | Admin | Collaborator | Viewer |
|--------|-------|-------|--------------|--------|
| Voir les projets | ✅ | ✅ | ✅ | ✅ |
| Créer un projet | ✅ | ❌ | ❌ | ❌ |
| Modifier le projet | ✅ | ❌ | ❌ | ❌ |
| Supprimer le projet | ✅ | ❌ | ❌ | ❌ |
| Voir les membres | ✅ | ✅ | ✅ | ✅ |
| Ajouter des membres | ✅ | ❌ | ❌ | ❌ |
| Modifier les rôles | ✅ | ❌ | ❌ | ❌ |
| Retirer des membres | ✅ | ❌ | ❌ | ❌ |
| Voir les tâches | ✅ | ✅ | ✅ | ✅ |
| Créer des tâches | ✅ | ✅ | ✅ | ❌ |
| Modifier les tâches | ✅ | ✅ | Limité* | ❌ |
| Supprimer les tâches | ✅ | ✅ | Limité* | ❌ |
| Changer le statut | ✅ | ✅ | ✅ | ❌ |
| Assigner des tâches | ✅ | ✅ | ❌ | ❌ |

*Limité: seulement ses propres tâches

---

## Pipeline des Données

### Flux HTTP

```
Angular Application (port 4200)
         ↓
   proxy.conf.json
         ↓
   /api/* → http://127.0.0.1:3000
         ↓
json-server (port 3000)
         ↓
     db.json
```

### Endpoints API

#### Users
- `GET /api/users` - Liste tous les utilisateurs
- `GET /api/users?id={id}` - Récupère un utilisateur par ID
- `GET /api/users?email={email}` - Recherche un utilisateur par email
- `POST /api/users` - Crée un nouvel utilisateur
- `PATCH /api/users/{id}` - Met à jour un utilisateur
- `DELETE /api/users/{id}` - Supprime un utilisateur

#### Projects
- `GET /api/projects` - Liste tous les projets
- `GET /api/projects/{id}` - Récupère un projet par ID
- `POST /api/projects` - Crée un nouveau projet
- `PATCH /api/projects/{id}` - Met à jour un projet
- `DELETE /api/projects/{id}` - Supprime un projet

#### ProjectMembers
- `GET /api/projectMembers` - Liste tous les memberships
- `GET /api/projectMembers?id={id}` - Récupère un membership par ID
- `GET /api/projectMembers?projectId={id}` - Liste les membres d'un projet
- `GET /api/projectMembers?userId={id}` - Liste les projets d'un utilisateur
- `GET /api/projectMembers?projectId={pid}&userId={uid}` - Vérifie l'appartenance
- `POST /api/projectMembers` - Ajoute un membre à un projet
- `PATCH /api/projectMembers/{id}` - Met à jour le rôle d'un membre
- `DELETE /api/projectMembers/{id}` - Retire un membre d'un projet

#### Tasks
- `GET /api/tasks` - Liste toutes les tâches
- `GET /api/tasks?id={id}` - Récupère une tâche par ID
- `GET /api/tasks?projectId={id}` - Liste les tâches d'un projet
- `POST /api/tasks` - Crée une nouvelle tâche
- `PATCH /api/tasks/{id}` - Met à jour une tâche
- `DELETE /api/tasks/{id}` - Supprime une tâche

### Gestion des Erreurs

Les services utilisent `catchError` pour gérer les erreurs HTTP:
- Utilisateur non trouvé
- Email déjà utilisé
- Projet non trouvé
- Membre déjà existant
- Erreurs réseau

Les erreurs sont affichées dans l'UI via des signaux d'erreur (`errorMessage`, `memberErrorMessage`, etc.).

---

## Prochaines Étapes Suggérées

### Pour les Tâches

1. **Créer un TaskService** (`src/app/services/task.service.ts`)
   - Méthodes CRUD pour les tâches
   - Gestion des permissions basée sur les rôles

2. **Ajouter le formulaire de création de tâche** dans `kanban.component.html`
   - Modal avec champs: titre, description, priorité, date d'échéance, assignee
   - Visible seulement si `canEdit` est true

3. **Ajouter le dropdown de changement de statut**
   - Sur chaque carte de tâche
   - Visible seulement si `canEdit` est true
   - Options: todo, in-progress, done

4. **Ajouter les boutons de modification/suppression**
   - Modification: modal avec tous les champs
   - Suppression: confirmation
   - Visibles selon les règles de permissions

5. **Ajouter l'assignation de tâche**
   - Dropdown avec la liste des membres du projet
   - Visible seulement pour Owner et Admin
   - Mise à jour du champ `assigneeId`

6. **Implémenter le Drag & Drop** (optionnel)
   - Utiliser Angular CDK Drag & Drop
   - Permettre de déplacer les tâches entre colonnes
   - Met à jour automatiquement le statut

---

## Notes Techniques

### Angular Signals
- Utilisés pour la réactivité dans tous les composants
- Remplacent les observables pour l'état local
- Computed signals pour les données dérivées (ex: `todoTasks`)

### Standalone Components
- Tous les composants sont standalone
- Pas de NgModule
- Imports directs des dépendances

### Lazy Loading
- Les composants sont chargés à la demande via `loadComponent`
- Améliore les performances initiales

### SSR (Server-Side Rendering)
- Configuration SSR présente (`@angular/ssr`)
- Fichiers: `server.ts`, `main.server.ts`, `app.config.server.ts`
- Non activé dans le script de démarrage actuel

### TailwindCSS
- Version 4.1.12
- Configuration via `.postcssrc.json`
- Styles personnalisés dans `src/styles.css`

---

## Conclusion

Ce projet implémente une application de gestion de tâches complète avec:
- ✅ Authentification sécurisée avec persistance de session
- ✅ Gestion des projets avec système de rôles
- ✅ Collaboration multi-utilisateurs
- ✅ Interface Kanban pour les tâches
- ⏳ CRUD complet des tâches (à implémenter)
- ⏳ Gestion fine des permissions pour les tâches (à implémenter)

L'architecture est modulaire et extensible, facilitant l'ajout de nouvelles fonctionnalités.
