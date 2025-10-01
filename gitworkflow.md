### Git Work Flow Vortrag GU

## Projekt mit mehrere Personen

1. nach git init wird ein development branch gemacht
2. für jedes feature wird ein branch gemacht (featurers haben meistens eine issu nummer zB 1000: Bestellung, 1025 Storniereung)
3. wenn featuere fertig ist wird es zurück in den development branch gemeregt 
4. erst wenn alle featuere für die Version fertig hat wird diese in den Master/Main mergen (Master/Main branch hat nur lauffähige versionen und diese wird dem kunden geliefert z.B. Version 1.0)
5. wenn 2 featuers die gleiche funktion angreiffen (z.B. update_order_table), kann es zu einen merge konflikt kommen, da jede die funktion anders geändert hat. Befor diese nicht aufgelöst werden kann man nicht mergen. Zu vermeiden ist ein FOTROTT_MERGE.
6. Fall ein Mergekonflikt komplex ist und eventuell neue commits verlangt, kann man ein neuen Branch machen(zB feat-storno-1), da wird dann so lang commitet bis alles lauft, und dann wird es in den Develop branch gemerget. Auch bekannt als Integretionbranch.

Branch ist ein commit mit einen Namen, wenn ein featuer fertig ist und mit development gemergt wird, kann man es loeschen.

```shell
drazen~/htl/3/project_git_flow_uebung$ git init
hint: Using 'master' as the name for the initial branch. This default branch name
hint: is subject to change. To configure the initial branch name to use in all
hint: of your new repositories, which will suppress this warning, call:
hint:
hint:   git config --global init.defaultBranch <name>
hint:
hint: Names commonly chosen instead of 'master' are 'main', 'trunk' and
hint: 'development'. The just-created branch can be renamed via this command:
hint:
hint:   git branch -m <name>
Initialized empty Git repository in /home/drazen/htl/3/project_git_flow_uebung/.git/
drazen~/htl/3/project_git_flow_uebung$ git config --global init.defaultBranch main
drazen~/htl/3/project_git_flow_uebung$ git branch -m main  
drazen~/htl/3/project_git_flow_uebung$ micro hallo.txt #hier wurde hallo reingeschrieben
drazen~/htl/3/project_git_flow_uebung$ git checkout -b development
Switched to a new branch 'development'
drazen~/htl/3/project_git_flow_uebung$ micro hallo.txt #hier wurde alles geloeschtt
drazen~/htl/3/project_git_flow_uebung$ git status
On branch development

No commits yet

Untracked files:
  (use "git add <file>..." to include in what will be committed)
        hallo.txt

nothing added to commit but untracked files present (use "git add" to track)
drazen~/htl/3/project_git_flow_uebung$ git add hallo.txt 
drazen~/htl/3/project_git_flow_uebung$ git commit -m 'initial commit'
[development (root-commit) 0178a3a] initial commit
 1 file changed, 0 insertions(+), 0 deletions(-)
 create mode 100644 hallo.txt
drazen~/htl/3/project_git_flow_uebung$ git status
On branch development
nothing to commit, working tree clean
drazen~/htl/3/project_git_flow_uebung$ git log --all --decorate --online --graph
fatal: unrecognized argument: --online
drazen~/htl/3/project_git_flow_uebung$ git log --all --decorate --oneline --graph
* 0178a3a (HEAD -> development) initial commit
drazen~/htl/3/project_git_flow_uebung$ git checkout -b feature-bestellung
Switched to a new branch 'feature-bestellung'
drazen~/htl/3/project_git_flow_uebung$ micro hallo.txt  #function reingeschreiben
drazen~/htl/3/project_git_flow_uebung$ git add hallo.txt 
drazen~/htl/3/project_git_flow_uebung$ git commit -m 'grundgeruest der bestellung abgeschlossen'
[feature-bestellung 51a81a6] grundgeruest der bestellung abgeschlossen
 1 file changed, 3 insertions(+)
drazen~/htl/3/project_git_flow_uebung$ git log --all --decorate --oneline --graph
* 51a81a6 (HEAD -> feature-bestellung) grundgeruest der bestellung abgeschlossen
* 0178a3a (development) initial commit
```

2 branches erzeugt und ein paar kommits gemacht.

So wird gemerget:
man muss sich im zielbranch befinden. ganz wichtig  --no-ff (es wird in nano ein File aufgemacht wo eine generierte merge message steht, man kann sie bearbeiten)
```shell
drazen~/htl/3/project_git_flow_uebung$ git checkout development
Switched to branch 'development'
drazen~/htl/3/project_git_flow_uebung$ cat hallo.txt #man sieht das die Datei leer ist!
drazen~/htl/3/project_git_flow_uebung$ git merge feature-bestellung --no-ff
Merge made by the 'ort' strategy.
 hallo.txt | 3 +++
 1 file changed, 3 insertions(+)
drazen~/htl/3/project_git_flow_uebung$ cat hallo.txt 
function bestelle() {

}
drazen~/htl/3/project_git_flow_uebung$ git log --all --decorate --oneline --graph
*   c25199e (HEAD -> development) Merge branch 'feature-bestellung' into development
|\  
| * 51a81a6 (feature-bestellung) grundgeruest der bestellung abgeschlossen
|/  
* 0178a3a initial commit
drazen~/htl/3/project_git_flow_uebung$ git branch #sieht man in welchen branch wir sind
* development
  feature-bestellung
drazen~/htl/3/project_git_flow_uebung$ git checkout -b bugfix-bestellung
Switched to a new branch 'bugfix-bestellung'
drazen~/htl/3/project_git_flow_uebung$ micro hallo.txt 
drazen~/htl/3/project_git_flow_uebung$ git add hallo.txt 
drazen~/htl/3/project_git_flow_uebung$ git commit -m 'bugfix erledigt'
[bugfix-bestellung 19a1938] bugfix erledigt
 1 file changed, 1 insertion(+), 1 deletion(-)
drazen~/htl/3/project_git_flow_uebung$ git log --all --decorate --oneline --graph
* 19a1938 (HEAD -> bugfix-bestellung) bugfix erledigt
*   c25199e (development) Merge branch 'feature-bestellung' into development
|\  
| * 51a81a6 (feature-bestellung) grundgeruest der bestellung abgeschlossen
|/  
* 0178a3a initial commit
drazen~/htl/3/project_git_flow_uebung$ micro hallo.txt # noch etwas gemacht
drazen~/htl/3/project_git_flow_uebung$ git add .
drazen~/htl/3/project_git_flow_uebung$ git commit -m 'noch was gemacht'
[bugfix-bestellung 4521149] noch was gemacht
 1 file changed, 5 insertions(+)
drazen~/htl/3/project_git_flow_uebung$ git log --all -decorater --oneline -graph
fatal: unrecognized argument: -decorater
drazen~/htl/3/project_git_flow_uebung$ git log --all --decorate --oneline --graph
* 4521149 (HEAD -> bugfix-bestellung) noch was gemacht
* 19a1938 bugfix erledigt
*   c25199e (development) Merge branch 'feature-bestellung' into development
|\  
| * 51a81a6 (feature-bestellung) grundgeruest der bestellung abgeschlossen
|/  
* 0178a3a initial commit
# jetzt storno wrid gebaut und gemerget
drazen~/htl/3/project_git_flow_uebung$ micro hallo.txt 
drazen~/htl/3/project_git_flow_uebung$ git add .
drazen~/htl/3/project_git_flow_uebung$ git commit -m 'storno'
[feature-storno 0e7ce63] storno
 1 file changed, 9 insertions(+)
drazen~/htl/3/project_git_flow_uebung$ git checkout development 
Switched to branch 'development'
drazen~/htl/3/project_git_flow_uebung$ git merge feature-storno --no-ff
Merge made by the 'ort' strategy.
 hallo.txt | 9 +++++++++
 1 file changed, 9 insertions(+)
drazen~/htl/3/project_git_flow_uebung$ git log --all --decorate --oneline --graph
*   ce2ab5b (HEAD -> development) Merge branch 'feature-storno' into development
|\  
| * 0e7ce63 (feature-storno) storno
|/  
| * 4521149 (bugfix-bestellung) noch was gemacht
| * 19a1938 bugfix erledigt
|/  
*   c25199e Merge branch 'feature-bestellung' into development
|\  
| * 51a81a6 (feature-bestellung) grundgeruest der bestellung abgeschlossen
|/  
* 0178a3a initial commit
drazen~/htl/3/project_git_flow_uebung$ 
# jetzt wollen wir den anderen branch machen und einen konflikt provozieren der dann handisch zum loesen ist (habs leider nicht geschafft mit zu tippen)
```