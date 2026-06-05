# TaskFlowAngular

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.7.

## Development server

### Running Frontend + Backend (Recommended)

To start both the **frontend** (Angular dev server on port 4200) and **backend** (json-server simulation on port 3000), run:

```bash
pnpm run dev
```

Or with npm:

```bash
npm run dev
```

This will launch:

- **Backend**: json-server on `http://127.0.0.1:3000` (simulates API endpoints)
- **Frontend**: Angular dev server on `http://127.0.0.1:4200` with proxy to backend

Once running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

### Running Frontend Only

If you need to run just the Angular dev server:

```bash
ng serve
```

**Note:** If running the frontend only without the backend, API requests will fail with `ECONNREFUSED` errors. Make sure to use `pnpm run dev` to start both services.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
