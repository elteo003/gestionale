# MANUALE TECNICO REACT APPLICATO

## FUNZIONE PROP DRILLING

Per evitare di dover passare tutti i parametri alle funzioni all' interno di un oggetto, si utilizza questa tenica. Specificando che tutti gli elementi sll' interno di quel specifico nodo avranno come argomenti e quindi valori quelli specificicati in value={...}

<ThemeContext.Provider value={{ theme, toggle Theme, set Theme}}>
{children}
</ThemeCOntext.Provider>

### si scrive value={{}} con le doppie graffe perchè:

In react quando devi passare degli oggetti a funzioni, o altri oggetti apri le doppie graffe.

*Invece le singole graffe servono per passare qualsiasi altra cosa: codice, valori, variabili...*

## SELLETTORE: color-scheme

Questo elemento è un selettore css che permette di definire temi standard (chiaro, o scuro tipicaente) da utilizzare. In questo modo il sistema ha delle impostazioni predefinite per come gestire alcuni temi specifici. 
Si possono customizzare e creare schemi proprietari o utilizzare i classici pre-impostati.Questa feature la si utilizza principalmente in react, siccome non ci sono dei metodi per definire, creare e gestire in maniera personalizzata appunto i temi. Tendendenzialmente per gestire anche gli oggetti all' interno dell' applicazione si usano librerie UI come [MANTINE](https://kinsta.com/it/blog/libreria-componenti-react/)

## REBDERING CONDIZIONATO 

###sintassi

{bool && ()()}

Se bool  è vero allora eseguo (rappresentato dal doppio &) ciò che ho scritto nella prima parentesi tonda. [RENDERING CONDIZIONALE](https://react.dev/learn/conditional-rendering)