# Sven & Kev: webbplats

Svensk presentationssida för beslutsmodellerna **Sven** (0,6 miljarder parametrar) och **Kev** (4 miljarder),
som är tränade på beslut från CSN, ÖKS, ÖNH, JO och Skolinspektionen.

- Modeller: [sven-myndighet-0.6b](https://huggingface.co/birgermoell/sven-myndighet-0.6b), [kev-myndighet-4b](https://huggingface.co/birgermoell/kev-myndighet-4b)
- Data: [birgermoell/myndighetsbeslut](https://huggingface.co/datasets/birgermoell/myndighetsbeslut)
- Kod, regelmotorer och utvärdering: [BirgerMoell/myndighetsagenter](https://github.com/BirgerMoell/myndighetsagenter)

Webbplatsen är ren HTML, CSS och JavaScript utan byggsteg, utan beroenden och utan externa anrop (inga cookies,
inga typsnitt eller skript från tredje part).

```bash
python3 -m http.server 8765      # öppna http://localhost:8765
```

Resultattabellen läser `assets/results.js`, som är genererad ur utvärderingsfilerna i datamängden
(`results/` på Hugging Face). Siffrorna ska alltid följa dem. Webbplatsens kod är MIT-licensierad; modellerna är
Apache-2.0 och datamängden CC BY 4.0.
