import type { TreeNode } from '../types/database';

export const mockTreeData: TreeNode[] = [
  { id:'t1', type:'TITRE', numero:'I', label:'Dispositions générales', sort_order:1, vs:'ok', children:[
    { id:'t1c1', type:'CHAPITRE', numero:'1er', label:'Champ d\'application', sort_order:1, vs:'ok', children:[
      { id:'a1', type:'ARTICLE', numero:'1', label:'Objet de la loi', sort_order:1, vs:'ok', validity:'2024-06-14 → ∞',
        content:'La présente loi a pour objet de définir les règles applicables à l\'organisation et au fonctionnement des services publics numériques, en garantissant l\'accessibilité, la transparence et la protection des données personnelles des utilisateurs.',
        versions:[
          { id:'v1', date:'2024-06-14', created_at:'2024-06-14', type:'creation', title:'Rédaction initiale', author:'Direction juridique',
            contenu_texte:'La présente loi a pour objet de définir les règles applicables à l\'organisation et au fonctionnement des services publics numériques.' },
          { id:'v2', date:'2024-07-01', created_at:'2024-07-01', type:'modification', title:'Extension aux droits des usagers', author:'Commission parlementaire',
            contenu_texte:'La présente loi a pour objet de définir les règles applicables à l\'organisation et au fonctionnement des services publics numériques, en garantissant l\'accessibilité, la transparence et la protection des données personnelles des utilisateurs.',
            prev:'La présente loi a pour objet de définir les règles applicables à l\'organisation et au fonctionnement des services publics numériques.' },
        ]},
      { id:'a2', type:'ARTICLE', numero:'2', label:'Définitions', sort_order:2, vs:'ok', validity:'2024-06-14 → ∞',
        content:'Au sens de la présente loi, on entend par :\n1° « service public numérique » : tout service en ligne mis à disposition des usagers par une personne publique ;\n2° « données personnelles » : toute information se rapportant à une personne physique identifiée ou identifiable.',
        versions:[
          { id:'v3', date:'2024-06-14', created_at:'2024-06-14', type:'creation', title:'Rédaction initiale', author:'Direction juridique',
            contenu_texte:'Au sens de la présente loi, on entend par :\n1° « service public numérique » : tout service en ligne mis à disposition des usagers par une personne publique ;\n2° « données personnelles » : toute information se rapportant à une personne physique identifiée ou identifiable.' },
        ]},
      { id:'a3', type:'ARTICLE', numero:'3', label:'Principes directeurs', sort_order:3, vs:'pend', validity:'2024-06-14 → ∞',
        content:'Les services publics numériques sont soumis aux principes de continuité, d\'adaptabilité, d\'égalité d\'accès et de neutralité technologique.',
        versions:[
          { id:'v4', date:'2024-06-14', created_at:'2024-06-14', type:'creation', title:'Rédaction initiale', author:'Direction juridique',
            contenu_texte:'Les services publics numériques sont soumis aux principes de continuity et d\'adaptabilité.' },
          { id:'v5', date:'2024-08-20', created_at:'2024-08-20', type:'modification', title:'Ajout des principes d\'égalité et neutralité', author:'Conseil d\'État',
            contenu_texte:'Les services publics numériques sont soumis aux principes de continuité, d\'adaptabilité, d\'égalité d\'accès et de neutralité technologique.',
            prev:'Les services publics numériques sont soumis aux principes de continuité et d\'adaptabilité.' },
          { id:'v6', date:'2025-01-15', created_at:'2025-01-15', type:'modification', title:'Révision proposée — ajout accessibilité universelle', author:'DINUM', pending:true,
            contenu_texte:'Les services publics numériques sont soumis aux principes de continuité, d\'adaptabilité, d\'égalité d\'accès, de neutralité technologique et d\'accessibilité universelle.',
            prev:'Les services publics numériques sont soumis aux principes de continuité, d\'adaptabilité, d\'égalité d\'accès et de neutralité technologique.' },
        ]},
    ]},
    { id:'t1c2', type:'CHAPITRE', numero:'2', label:'Autorités compétentes', sort_order:2, vs:'pend', children:[
      { id:'a4', type:'ARTICLE', numero:'4', label:'Autorité de régulation', sort_order:1, vs:'pend', validity:'2024-06-14 → ∞',
        content:'Il est institué une Autorité nationale de régulation du numérique public. L\'Autorité est une autorité administrative indépendante dotée de la personnalité morale.',
        versions:[
          { id:'v7', date:'2024-06-14', created_at:'2024-06-14', type:'creation', title:'Rédaction initiale', author:'Direction juridique',
            contenu_texte:'Il est institué une Autorité nationale de régulation du numérique public. L\'Autorité est une autorité administrative indépendante dotée de la personnalité morale.' },
        ]},
      { id:'a5', type:'ARTICLE', numero:'5', label:'Composition de l\'Autorité', sort_order:2, vs:'err', validity:'2024-06-14 → ∞',
        content:'[À compléter — composition et modalités de nomination des membres.]',
        versions:[
          { id:'v8', date:'2024-06-14', created_at:'2024-06-14', type:'creation', title:'Version initiale incomplète', author:'Direction juridique',
            contenu_texte:'[À compléter — composition et modalités de nomination des membres.]' },
        ]},
    ]},
  ]},
  { id:'t2', type:'TITRE', numero:'II', label:'Obligations des opérateurs', sort_order:2, vs:'pend', children:[
    { id:'t2s1', type:'SECTION', numero:'1', label:'Accessibilité numérique', sort_order:1, vs:'pend', children:[
      { id:'a6', type:'ARTICLE', numero:'6', label:'Référentiel d\'accessibilité', sort_order:1, vs:'ok', validity:'2024-06-14 → ∞',
        content:'Tout opérateur est tenu de se conformer aux référentiels d\'accessibilité définis par décret en Conseil d\'État, dans un délai de dix-huit mois à compter de la publication de la présente loi.',
        versions:[
          { id:'v9', date:'2024-06-14', created_at:'2024-06-14', type:'creation', title:'Rédaction initiale', author:'Direction juridique',
            contenu_texte:'Tout opérateur est tenu de se conformer aux référentiels d\'accessibilité définis par décret.' },
          { id:'v10', date:'2024-09-01', created_at:'2024-09-01', type:'modification', title:'Précision du délai de mise en conformité', author:'Service juridique',
            contenu_texte:'Tout opérateur est tenu de se conformer aux référentiels d\'accessibilité définis par décret en Conseil d\'État, dans un délai de dix-huit mois à compter de la publication de la présente loi.',
            prev:'Tout opérateur est tenu de se conformer aux référentiels d\'accessibilité définis par décret.' },
        ]},
      { id:'a7', type:'ARTICLE', numero:'7', label:'Déclaration de conformité', sort_order:2, vs:'pend', validity:'2024-06-14 → ∞',
        content:'Les opérateurs publient sur leur site une déclaration d\'accessibilité attestant du niveau de conformité atteint. Cette déclaration est mise à jour chaque année.',
        versions:[
          { id:'v11', date:'2024-06-14', created_at:'2024-06-14', type:'creation', title:'Rédaction initiale', author:'Direction juridique',
            contenu_texte:'Les opérateurs publient sur leur site une déclaration d\'accessibilité attestant du niveau de conformité atteint. Cette déclaration est mise à jour chaque année.' },
        ]},
    ]},
    { id:'t2s2', type:'SECTION', numero:'2', label:'Transparence des données', sort_order:2, vs:'ok', children:[
      { id:'a8', type:'ARTICLE', numero:'8', label:'Information des usagers', sort_order:1, vs:'ok', validity:'2024-06-14 → ∞',
        content:'Les opérateurs informent les usagers, de manière claire et accessible, des finalités du traitement de leurs données personnelles et des droits dont ils disposent.',
        versions:[
          { id:'v12', date:'2024-06-14', created_at:'2024-06-14', type:'creation', title:'Rédaction initiale', author:'Direction juridique',
            contenu_texte:'Les opérateurs informent les usagers, de manière claire et accessible, des finalités du traitement de leurs données personnelles et des droits dont ils disposent.' },
        ]},
      { id:'a9', type:'ARTICLE', numero:'9', label:'Registre des traitements', sort_order:2, vs:'ok', validity:'2024-06-14 → ∞',
        content:'Tout opérateur tient et rend public un registre des traitements de données mis en œuvre dans le cadre du service public numérique, accessible en ligne dans un format ouvert.',
        versions:[
          { id:'v13', date:'2024-06-14', created_at:'2024-06-14', type:'creation', title:'Rédaction initiale', author:'Direction juridique',
            contenu_texte:'Tout opérateur tient et rend public un registre des traitements de données mis en œuvre dans le cadre du service public numérique, accessible en ligne dans un format ouvert.' },
        ]},
    ]},
  ]},
  { id:'t3', type:'TITRE', numero:'III', label:'Sanctions et contrôle', sort_order:3, vs:'pend', children:[
    { id:'a10', type:'ARTICLE', numero:'10', label:'Pouvoirs de contrôle', sort_order:1, vs:'pend', validity:'2024-06-14 → ∞',
      content:'L\'Autorité dispose d\'un pouvoir d\'investigation lui permettant de diligenter des audits techniques auprès de tout opérateur soumis aux dispositions de la présente loi.',
      versions:[
        { id:'v14', date:'2024-06-14', created_at:'2024-06-14', type:'creation', title:'Rédaction initiale', author:'Direction juridique',
          contenu_texte:'L\'Autorité dispose d\'un pouvoir d\'investigation lui permettant de diligenter des audits techniques auprès de tout opérateur soumis aux dispositions de la présente loi.' },
      ]},
    { id:'a11', type:'ARTICLE', numero:'11', label:'Sanctions administratives', sort_order:2, vs:'pend', validity:'2024-06-14 → ∞',
      content:'En cas de manquement, l\'Autorité peut prononcer des sanctions pécuniaires ne pouvant excéder 1 % du chiffre d\'affaires annuel mondial de l\'opérateur.',
      versions:[
        { id:'v15', date:'2024-06-14', created_at:'2024-06-14', type:'creation', title:'Rédaction initiale', author:'Direction juridique',
          contenu_texte:'En cas de manquement, l\'Autorité peut prononcer des sanctions pécuniaires.' },
        { id:'v16', date:'2024-10-15', created_at:'2024-10-15', type:'modification', title:'Plafonnement à 1 % du CA mondial', author:'Conseil d\'État',
          contenu_texte:'En cas de manquement, l\'Autorité peut prononcer des sanctions pécuniaires ne pouvant excéder 1 % du chiffre d\'affaires annuel mondial de l\'opérateur.',
          prev:'En cas de manquement, l\'Autorité peut prononcer des sanctions pécuniaires.' },
        { id:'v17', date:'2025-02-10', created_at:'2025-02-10', type:'modification', title:'Révision à 2 % du CA (projet)', author:'Commission européenne', pending:true,
          contenu_texte:'En cas de manquement, l\'Autorité peut prononcer des sanctions pécuniaires ne pouvant excéder 2 % du chiffre d\'affaires annuel mondial de l\'opérateur.',
          prev:'En cas de manquement, l\'Autorité peut prononcer des sanctions pécuniaires ne pouvant excéder 1 % du chiffre d\'affaires annuel mondial de l\'opérateur.' },
      ]},
    { id:'a12', type:'ARTICLE', numero:'12', label:'Dispositions finales', sort_order:3, vs:'ok', validity:'2024-06-14 → ∞',
      content:'La présente loi entre en vigueur le lendemain de sa publication au Journal officiel de la République française.',
      versions:[
        { id:'v18', date:'2024-06-14', created_at:'2024-06-14', type:'creation', title:'Rédaction initiale', author:'Direction juridique',
          contenu_texte:'La présente loi entre en vigueur le lendemain de sa publication au Journal officiel de la République française.' },
      ]},
  ]},
];

export const mockPdfPages = [
  `<h1>LOI N° 2024-537 DU 13 JUIN 2024</h1><p style="text-align:center;font-style:italic;margin-bottom:18px">relative à l'organisation et au fonctionnement des services publics numériques</p><p style="text-align:center;margin-bottom:22px">L'Assemblée nationale et le Sénat ont adopté,<br>Le Président de la République promulgue la loi dont la teneur suit&nbsp;:</p><h2>TITRE I&emsp;DISPOSITIONS GÉNÉRALES</h2><h3>Chapitre 1<sup>er</sup> — Champ d'application</h3><p><span class="an">Article 1<sup>er</sup>.</span>&ensp;La présente loi a pour objet de définir les règles applicables à l'organisation et au fonctionnement des services publics numériques, en garantissant l'accessibilité, la transparence et la protection des données personnelles des utilisateurs.</p><p><span class="an">Article 2.</span>&ensp;Au sens de la présente loi, on entend par&nbsp;:<br>1° «&nbsp;service public numérique&nbsp;» : tout service en ligne mis à disposition des usagers par une personne publique&nbsp;;<br>2° «&nbsp;données personnelles&nbsp;» : toute information se rapportant à une personne physique identifiée ou identifiable.</p><p><span class="an">Article 3.</span>&ensp;Les services publics numériques sont soumis aux principes de continuité, d'adaptabilité, d'égalité d'accès et de neutralité technologique.</p>`,
  `<h3>Chapitre 2 — Autorités compétentes</h3><p><span class="an">Article 4.</span>&ensp;Il est institué une Autorité nationale de régulation du numérique public. L'Autorité est une autorité administrative indépendante dotée de la personnalité morale.</p><p><span class="an">Article 5.</span>&ensp;[Composition et modalités de nomination des membres de l'Autorité — texte à compléter par décret]</p><h2>TITRE II&emsp;OBLIGATIONS DES OPÉRATEURS</h2><h3>Section 1 — Accessibilité numérique</h3><p><span class="an">Article 6.</span>&ensp;Tout opérateur est tenu de se conformer aux référentiels d'accessibilité définis par décret en Conseil d'État, dans un délai de dix-huit mois à compter de la publication de la présente loi.</p><p><span class="an">Article 7.</span>&ensp;Les opérateurs publient sur leur site une déclaration d'accessibilité attestant du niveau de conformité atteint. Cette déclaration est mise à jour chaque année.</p>`,
  `<h3>Section 2 — Transparence des données</h3><p><span class="an">Article 8.</span>&ensp;Les opérateurs informent les usagers, de manière claire et accessible, des finalités du traitement de leurs données personnelles et des droits dont ils disposent.</p><p><span class="an">Article 9.</span>&ensp;Tout opérateur tient et rend public un registre des traitements de données mis en œuvre dans le cadre du service public numérique, accessible en ligne dans un format ouvert.</p><h2>TITRE III&emsp;SANCTIONS ET CONTRÔLE</h2><p><span class="an">Article 10.</span>&ensp;L'Autorité dispose d'un pouvoir d'investigation lui permettant de diligenter des audits techniques auprès de tout opérateur soumis aux dispositions de la présente loi.</p>`,
  `<p><span class="an">Article 11.</span>&ensp;En cas de manquement, l'Autorité peut prononcer, après mise en demeure restée infructueuse, des sanctions pécuniaires dont le montant ne peut excéder 1&nbsp;% du chiffre d'affaires annuel mondial de l'opérateur.</p><p><span class="an">Article 12.</span>&ensp;La présente loi entre en vigueur le lendemain de sa publication au Journal officiel de la République française.</p><p style="margin-top:40px;text-align:center;font-style:italic">La présente loi sera exécutée comme loi de l'État.</p><p style="text-align:center;margin-top:14px">Fait à Paris, le 13 juin 2024</p><p style="text-align:center;font-size:10px;margin-top:10px"><strong>EMMANUEL MACRON</strong></p>`,
];
