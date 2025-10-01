### Git Work Flow Vortrag GU

## Projekt mit mehrere Personen

1. nach git init wird ein development branch gemacht
2. für jedes feature wird ein branch gemacht (featurers haben meistens eine issu nummer zB 1000: Bestellung, 1025 Storniereung)
3. wenn featuere fertig ist wird es zurück in den development branch gemeregt 
4. erst wenn alle featuere für die Version fertig hat wird diese in den Master/Main mergen (Master/Main branch hat nur lauffähige versionen und diese wird dem kunden geliefert z.B. Version 1.0)
5. wenn 2 featuers die gleiche funktion angreiffen (z.B. update_order_table), kann es zu einen merge konflikt kommen, da jede die funktion anders geändert hat. Befor diese nicht aufgelöst werden kann man nicht mergen. Zu vermeiden ist ein FOTROTT_MERGE.
6. Fall ein Mergekonflikt komplex ist und eventuell neue commits verlangt, kann man ein neuen Branch machen(zB feat-storno-1), da wird dann so lang commitet bis alles lauft, und dann wird es in den Develop branch gemerget. Auch bekannt als Integretionbranch.

