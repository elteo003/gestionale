# Come Creare/Aggiornare l'Utente Admin IT

## Problema
Se non riesci ad accedere con `matteodiliberto4@gmail.com` e password `Mammaketty74!`, probabilmente:
1. L'utente non esiste nel database
2. La password è stata salvata in modo errato
3. Il constraint del ruolo non include "IT"

## Soluzione

### Opzione 1: Usa lo script Node.js (Raccomandato)

1. Vai nella cartella `backend`:
   ```bash
   cd backend
   ```

2. Esegui lo script per creare/aggiornare l'utente:
   ```bash
   npm run create-user
   ```

Lo script:
- Aggiorna il constraint del ruolo per includere tutti i ruoli (IT, Admin, etc.)
- Crea l'utente se non esiste
- Aggiorna la password se l'utente esiste già
- Testa che la password funzioni correttamente

### Opzione 2: Usa SQL direttamente

Se preferisci usare SQL direttamente sul database:

1. Esegui prima lo script per aggiornare il constraint:
   ```sql
   -- File: backend/scripts/fix_user_role_constraint.sql
   ALTER TABLE users 
   DROP CONSTRAINT IF EXISTS users_role_check;

   ALTER TABLE users 
   ADD CONSTRAINT users_role_check 
   CHECK (role IN ('Socio', 'Responsabile', 'Admin', 'Presidente', 'CDA', 'Tesoreria', 'Marketing', 'Commerciale', 'IT', 'Audit'));
   ```

2. Poi crea/aggiorna l'utente manualmente (la password deve essere hashata con bcrypt)

### Opzione 3: Usa la registrazione dal frontend

1. Vai alla pagina di login
2. Clicca su "Non hai un account? Registrati"
3. Compila il form con:
   - Nome: Matteo Di Liberto
   - Email: matteodiliberto4@gmail.com
   - Password: Mammaketty74!
   - Ruolo: IT
   - Area: IT

## Verifica

Dopo aver eseguito lo script, prova a fare login con:
- Email: `matteodiliberto4@gmail.com`
- Password: `Mammaketty74!`

Se ancora non funziona, controlla:
1. Il backend è avviato?
2. Il database è connesso?
3. La console del browser mostra errori?
4. I log del backend mostrano errori?

