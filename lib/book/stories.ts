import type { AgeGroup } from "../validation";
import type { IllustrationId } from "./illustrations";

/**
 * Conteúdo editorial original.
 *
 * Regras seguidas na redação:
 * - As histórias são RECONTADAS com palavras simples. Não há citações bíblicas
 *   literais nem falas entre aspas atribuídas a personagens bíblicos; as falas
 *   aparecem em discurso indireto. A referência (livro e capítulos) acompanha
 *   cada história para leitura do texto bíblico completo.
 * - Os acontecimentos seguem os textos indicados; detalhes difíceis para a idade
 *   são omitidos, nunca trocados por eventos inventados.
 * - Linguagem neutra quanto ao gênero da criança (o livro não pergunta o gênero):
 *   evita adjetivos que concordam com a criança ("obrigado/obrigada",
 *   "querido/querida"), usando "eu te agradeço", "Deus ama você" etc.
 * - {nome} é o único marcador; é substituído com escape de HTML.
 */

export type AgeTexts<T> = Record<AgeGroup, T>;

export type Story = {
  id: string;
  title: string;
  reference: string;
  illustration: IllustrationId;
  paragraphs: AgeTexts<string[]>;
  lesson: AgeTexts<string>;
  practice: AgeTexts<string>;
  prayer: { short: string; full: string };
  questions: AgeTexts<string[]>;
};

export const STORIES: Story[] = [
  {
    id: "criacao",
    title: "Deus cria o mundo",
    reference: "Gênesis 1–2",
    illustration: "creation",
    paragraphs: {
      "2-4": [
        "No começo, Deus criou tudo.",
        "Deus fez a luz, o céu, a terra e o mar. Fez as plantas e as árvores.",
        "Deus fez o sol, a lua e as estrelas. Fez os peixes, os passarinhos e os bichos.",
        "Depois, Deus fez as pessoas com muito amor. Deus olhou tudo e viu que era muito bom!",
      ],
      "5-7": [
        "No começo de tudo, Deus criou os céus e a terra. Tudo estava escuro e vazio, mas Deus tinha um plano cheio de amor.",
        "No primeiro dia, Deus fez a luz. Ele chamou a luz de dia e a escuridão de noite.",
        "No segundo dia, Deus fez o céu. No terceiro dia, juntou as águas nos mares, fez aparecer a terra seca e a encheu de plantas, flores e árvores com frutos.",
        "No quarto dia, Deus colocou no céu o sol, a lua e as estrelas. No quinto dia, encheu os mares de peixes e o céu de aves.",
        "No sexto dia, Deus fez os animais da terra. Fez também o homem e a mulher, parecidos com Ele, para cuidarem de toda a criação.",
        "Deus olhou para tudo o que tinha feito e viu que era muito bom. No sétimo dia, Deus descansou.",
      ],
      "8-10": [
        "A Bíblia começa contando que, no princípio, Deus criou os céus e a terra. A terra era sem forma e vazia, coberta de escuridão, e o Espírito de Deus se movia sobre as águas.",
        "Então Deus falou, e a luz passou a existir. Ele separou a luz da escuridão: a luz foi chamada de dia, e a escuridão, de noite. Esse foi o primeiro dia.",
        "No segundo dia, Deus fez o céu, separando as águas de cima das águas de baixo. No terceiro dia, reuniu as águas nos mares, fez surgir a terra seca e a cobriu de plantas e árvores que dão sementes e frutos.",
        "No quarto dia, Deus colocou luzes no céu: o sol para governar o dia, a lua e as estrelas para a noite, marcando estações, dias e anos. No quinto dia, encheu as águas de seres vivos e o céu de aves, e os abençoou.",
        "No sexto dia, Deus fez os animais da terra. Depois criou o ser humano à sua imagem — homem e mulher — e confiou a eles o cuidado da terra e de todos os animais. O capítulo 2 conta que Deus formou o homem do pó da terra e soprou nele o fôlego de vida, e o colocou num jardim, no Éden, para cultivá-lo e guardá-lo.",
        "Deus viu tudo o que havia feito, e era muito bom. No sétimo dia, Ele descansou de toda a sua obra, abençoou esse dia e o separou como especial.",
      ],
    },
    lesson: {
      "2-4": "{nome}, Deus fez o mundo bonito. E Deus fez você com muito amor!",
      "5-7": "Deus criou tudo com cuidado e viu que era bom. {nome}, você também faz parte da criação de Deus, e Ele ama você.",
      "8-10": "Tudo o que existe tem um Criador que planejou cada detalhe. {nome}, cuidar da natureza, dos animais e das pessoas é uma forma de honrar a obra de Deus.",
    },
    practice: {
      "2-4": "Com um adulto, encontre três coisas que Deus criou: uma planta, um bichinho e o céu.",
      "5-7": "Esta semana, ajude a cuidar da criação: regue uma planta, economize água ou coloque o lixo no lugar certo.",
      "8-10": "Escolha um hábito de cuidado com a criação para praticar por sete dias (por exemplo, fechar a torneira ao escovar os dentes) e anote como foi.",
    },
    prayer: {
      short: "Querido Deus, eu te agradeço pelo sol, pelas flores e pelos bichinhos. Amém.",
      full: "Querido Deus, eu te agradeço pelo céu, pelo mar, pelas plantas e pelos animais. Eu te agradeço também por ter me criado. Ajuda-me a cuidar bem do mundo que o Senhor fez. Amém.",
    },
    questions: {
      "2-4": ["Onde está o sol na figura?", "Que bichinho você vê?"],
      "5-7": ["O que Deus colocou no céu no quarto dia?", "Qual animal da criação você acha mais bonito?", "Como você pode cuidar da natureza?"],
      "8-10": ["Por que você acha que Deus separou o sétimo dia como especial?", "O que significa cuidar da criação no dia a dia?", "Que parte da criação mais faz você se admirar com Deus?"],
    },
  },
  {
    id: "noe",
    title: "Noé e a grande arca",
    reference: "Gênesis 6–9",
    illustration: "ark",
    paragraphs: {
      "2-4": [
        "Noé amava a Deus e obedecia a Ele.",
        "Deus pediu a Noé que construísse um barco enorme: a arca.",
        "Noé, sua família e muitos casais de animais entraram na arca. Então choveu muito, muito!",
        "Deus cuidou de todos. Depois da chuva, apareceu no céu um lindo arco-íris.",
      ],
      "5-7": [
        "Há muito tempo, as pessoas tinham se afastado de Deus e faziam muitas coisas más. Mas Noé era um homem justo, que andava com Deus.",
        "Deus avisou Noé que viria um grande dilúvio e pediu que ele construísse uma arca bem grande, de madeira. Noé obedeceu e fez tudo como Deus mandou.",
        "Noé entrou na arca com sua esposa, seus três filhos e as esposas deles. Os animais também entraram, em casais. Então Deus fechou a porta.",
        "Choveu durante quarenta dias e quarenta noites, e a água cobriu a terra. Mas a arca boiava em segurança.",
        "Quando as águas baixaram, a arca parou sobre os montes de Ararate. Noé soltou uma pomba, e ela voltou com uma folha de oliveira no bico: a terra estava secando!",
        "Todos saíram da arca, e Noé agradeceu a Deus. Deus prometeu que nunca mais destruiria a terra com um dilúvio e colocou o arco-íris no céu como sinal dessa promessa.",
      ],
      "8-10": [
        "No tempo de Noé, a maldade das pessoas tinha se espalhado pela terra, e isso entristeceu a Deus. Noé, porém, era justo e andava com Deus, e encontrou favor diante dEle.",
        "Deus contou a Noé que mandaria um dilúvio e deu instruções detalhadas: construir uma arca de madeira, com compartimentos, revestida de betume por dentro e por fora, com uma janela e uma porta lateral. Noé fez tudo exatamente como Deus ordenou.",
        "Noé entrou na arca com a esposa, os filhos Sem, Cam e Jafé e as esposas deles — oito pessoas ao todo. Com eles entraram animais de todas as espécies, como Deus havia dito, e também alimento para todos. E o Senhor fechou a porta.",
        "A chuva caiu por quarenta dias e quarenta noites, e as águas cobriram até os montes mais altos. Durante todo esse tempo, Deus se lembrou de Noé e de todos os que estavam na arca.",
        "Deus fez soprar um vento, e as águas começaram a baixar. A arca parou sobre os montes de Ararate. Noé soltou um corvo e, depois, uma pomba. Na segunda vez, a pomba voltou com uma folha nova de oliveira; na terceira, não voltou mais, porque já havia terra seca.",
        "Quando Deus mandou, todos saíram da arca. Noé construiu um altar e adorou ao Senhor. Deus fez uma aliança: nunca mais um dilúvio destruiria a terra. E colocou o arco-íris nas nuvens como sinal dessa promessa.",
      ],
    },
    lesson: {
      "2-4": "Noé obedeceu, e Deus cuidou dele. {nome}, Deus também cuida de você!",
      "5-7": "Noé confiou em Deus e obedeceu, mesmo quando era difícil entender. {nome}, quando você vir um arco-íris, lembre que Deus cumpre o que promete.",
      "8-10": "Noé obedeceu com paciência durante muito tempo, sem ver ainda o resultado. {nome}, obedecer a Deus nas pequenas coisas de cada dia também é um ato de confiança.",
    },
    practice: {
      "2-4": "Imite os sons de três animais que entraram na arca!",
      "5-7": "Obedeça hoje a um pedido dos seus pais logo na primeira vez, com alegria — como Noé.",
      "8-10": "Pense em uma tarefa que você costuma adiar e faça-a hoje até o fim, com capricho, como Noé fez a arca.",
    },
    prayer: {
      short: "Querido Deus, eu te agradeço porque o Senhor cuida de mim. Amém.",
      full: "Querido Deus, eu te agradeço porque o Senhor sempre cumpre suas promessas. Ajuda-me a confiar e a obedecer, como Noé. Cuida da minha família e de todos os animais. Amém.",
    },
    questions: {
      "2-4": ["Quantos animais você vê na figura?", "De que cor é o arco-íris?"],
      "5-7": ["O que a pomba trouxe no bico?", "Qual é o sinal da promessa de Deus?", "Que animal você levaria para conversar na arca?"],
      "8-10": ["Por que Noé precisou de paciência?", "O que é uma aliança?", "Como você pode demonstrar confiança em Deus quando algo demora?"],
    },
  },
  {
    id: "mar",
    title: "Moisés e o caminho no mar",
    reference: "Êxodo 14",
    illustration: "sea",
    paragraphs: {
      "2-4": [
        "O povo de Deus estava saindo do Egito com Moisés.",
        "Na frente deles havia um mar enorme. Atrás vinha o exército do faraó. O povo ficou com medo.",
        "Moisés estendeu a mão sobre o mar, e Deus abriu um caminho no meio da água!",
        "O povo atravessou pelo chão seco. Deus salvou o seu povo!",
      ],
      "5-7": [
        "O povo de Israel tinha sido escravo no Egito por muito tempo. Deus usou Moisés para libertá-lo, e o povo partiu rumo à terra que Deus havia prometido.",
        "Mas o faraó mudou de ideia e foi atrás deles com seus carros de guerra. O povo chegou à beira do mar e ficou com muito medo, porque não havia para onde fugir.",
        "Moisés disse ao povo que não tivesse medo, porque o Senhor lutaria por eles. Uma coluna de nuvem se colocou entre o povo e o exército do Egito.",
        "Deus mandou Moisés estender a mão sobre o mar. Durante a noite inteira, um vento forte soprou, e as águas se abriram!",
        "O povo de Israel atravessou o mar por terra seca, com paredes de água dos dois lados. Quando todos chegaram ao outro lado, as águas voltaram ao lugar.",
        "O povo viu o grande poder de Deus e confiou no Senhor. Depois, cantaram juntos para agradecer.",
      ],
      "8-10": [
        "Depois de muitos anos de escravidão no Egito, os israelitas foram libertados. Deus guiava o povo com uma coluna de nuvem durante o dia e uma coluna de fogo à noite.",
        "Logo depois da partida, o faraó se arrependeu de ter deixado o povo ir. Reuniu seus carros de guerra e cavaleiros e perseguiu os israelitas até alcançá-los acampados junto ao mar.",
        "Ao ver o exército se aproximando, o povo ficou apavorado e reclamou com Moisés. Moisés respondeu que não tivessem medo, que ficassem firmes e veriam o livramento que o Senhor traria naquele dia.",
        "O anjo de Deus e a coluna de nuvem passaram para trás do povo, ficando entre os israelitas e os egípcios. Então Moisés estendeu a mão sobre o mar, e o Senhor fez soprar um forte vento oriental durante toda a noite. As águas se dividiram e o fundo do mar ficou seco.",
        "Os israelitas atravessaram pelo meio do mar em terra seca, com as águas como muralhas à direita e à esquerda. Os egípcios entraram atrás deles, mas, quando Moisés estendeu novamente a mão, as águas voltaram ao seu lugar.",
        "Naquele dia, o povo viu o que o Senhor tinha feito, temeu ao Senhor e confiou nele e em Moisés, seu servo. Em seguida, Moisés, Miriã e todo o povo cantaram louvores a Deus (Êxodo 15).",
      ],
    },
    lesson: {
      "2-4": "Quando sentir medo, {nome}, lembre: Deus está com você!",
      "5-7": "O povo achou que não havia saída, mas Deus abriu um caminho. {nome}, quando tiver medo, você pode orar e confiar que Deus está cuidando de você.",
      "8-10": "Às vezes um problema parece não ter saída. {nome}, a história do mar mostra que Deus é maior do que qualquer obstáculo e que podemos ficar firmes, confiando nEle.",
    },
    practice: {
      "2-4": "Faça com os braços o movimento do mar se abrindo!",
      "5-7": "Desenhe algo que às vezes dá medo em você e, ao lado, escreva ou desenhe: Deus está comigo.",
      "8-10": "Converse com alguém da família sobre um momento em que vocês viram Deus abrir um caminho. Escreva uma frase de agradecimento.",
    },
    prayer: {
      short: "Querido Deus, quando eu sentir medo, fica pertinho de mim. Amém.",
      full: "Querido Deus, o Senhor abriu um caminho no mar para salvar o seu povo. Quando eu sentir medo, ajuda-me a lembrar que o Senhor está comigo e cuida de mim. Amém.",
    },
    questions: {
      "2-4": ["Onde está a água na figura?", "Quem levantou a mão sobre o mar?"],
      "5-7": ["O que soprou a noite inteira sobre o mar?", "Como o povo se sentiu antes e depois de atravessar?", "O que você pode fazer quando tiver medo?"],
      "8-10": ["Por que o povo reclamou com Moisés?", "O que a coluna de nuvem fez para proteger o povo?", "Como você reage quando um problema parece não ter saída?"],
    },
  },
  {
    id: "davi",
    title: "Davi e o gigante Golias",
    reference: "1 Samuel 17",
    illustration: "david",
    paragraphs: {
      "2-4": [
        "Davi era um jovem pastor de ovelhas.",
        "Havia um gigante chamado Golias que assustava todo mundo.",
        "Davi não teve medo. Ele confiou em Deus e pegou cinco pedrinhas e sua funda.",
        "Davi atirou uma pedrinha, e o gigante caiu! Deus ajudou Davi.",
      ],
      "5-7": [
        "O exército de Israel estava diante do exército dos filisteus. Todos os dias, um gigante filisteu chamado Golias desafiava os israelitas, e todos ficavam com medo.",
        "Davi era o filho mais novo de Jessé e cuidava das ovelhas do pai. Um dia, ele levou comida para os irmãos que estavam no exército e ouviu o desafio do gigante.",
        "Davi contou ao rei Saul que, cuidando das ovelhas, já tinha enfrentado um leão e um urso, e que o Senhor o livraria também daquele gigante.",
        "O rei ofereceu sua armadura, mas ela era pesada demais. Davi pegou seu cajado, escolheu cinco pedras lisas no riacho e levou sua funda.",
        "Davi disse a Golias que vinha em nome do Senhor. Então girou a funda e atirou uma pedra, que acertou a testa do gigante. Golias caiu no chão!",
        "Todos viram que a vitória tinha vindo de Deus, e não da força ou do tamanho.",
      ],
      "8-10": [
        "Os filisteus e os israelitas estavam acampados em montes opostos, com um vale entre eles. Golias, um guerreiro filisteu enorme e muito bem armado, desafiou Israel durante quarenta dias: queria que um israelita lutasse com ele.",
        "Davi, o filho mais novo de Jessé, era pastor de ovelhas em Belém. Seu pai o mandou levar alimento aos irmãos mais velhos que serviam no exército de Saul. Ao chegar, Davi ouviu as provocações de Golias e ficou indignado por alguém desafiar o exército do Deus vivo.",
        "Levado ao rei Saul, Davi contou que, ao proteger as ovelhas, já havia livrado o rebanho de um leão e de um urso. Disse que o Senhor, que o livrara daquelas feras, também o livraria do filisteu.",
        "Saul vestiu Davi com sua armadura, mas Davi não conseguia andar com ela, pois não estava acostumado. Tirou tudo, pegou seu cajado, escolheu cinco pedras lisas no riacho, guardou-as na bolsa de pastor e foi com a funda na mão.",
        "Golias zombou do jovem. Davi respondeu que o gigante vinha com espada e lança, mas ele vinha em nome do Senhor dos Exércitos, para que todos soubessem que a batalha pertence ao Senhor. Então correu, atirou uma pedra com a funda e acertou a testa de Golias, que caiu com o rosto no chão.",
        "Os israelitas venceram a batalha naquele dia. A história mostra que Davi não confiava em armas nem em tamanho, mas em Deus.",
      ],
    },
    lesson: {
      "2-4": "Davi era pequeno, mas confiou em Deus. {nome}, Deus ajuda você também!",
      "5-7": "Davi não confiou na armadura nem no tamanho, mas em Deus. {nome}, você pode enfrentar desafios grandes pedindo ajuda a Deus.",
      "8-10": "A coragem de Davi veio da confiança em Deus, construída nas tarefas simples de pastor. {nome}, ser fiel nas pequenas responsabilidades prepara você para os grandes desafios.",
    },
    practice: {
      "2-4": "Conte cinco pedrinhas (ou cinco brinquedos) com a ajuda de um adulto.",
      "5-7": "Escolha um desafio desta semana (uma prova, uma conversa difícil) e ore antes de enfrentá-lo.",
      "8-10": "Liste uma tarefa simples que você faz todos os dias e pense em como fazê-la com mais fidelidade, como Davi fazia com as ovelhas.",
    },
    prayer: {
      short: "Querido Deus, ajuda-me a ter coragem. Amém.",
      full: "Querido Deus, Davi confiou no Senhor diante do gigante. Quando eu tiver um desafio grande, ajuda-me a ter coragem e a lembrar que o Senhor está comigo. Amém.",
    },
    questions: {
      "2-4": ["Quantas pedrinhas Davi pegou?", "Davi cuidava de qual animal?"],
      "5-7": ["Por que Davi não usou a armadura do rei?", "Quais animais Davi já tinha enfrentado?", "Qual desafio você quer entregar a Deus?"],
      "8-10": ["O que Davi disse sobre de quem era a batalha?", "Como as experiências como pastor prepararam Davi?", "Em que situação você precisa de coragem hoje?"],
    },
  },
  {
    id: "daniel",
    title: "Daniel na cova dos leões",
    reference: "Daniel 6",
    illustration: "daniel",
    paragraphs: {
      "2-4": [
        "Daniel amava a Deus e orava todos os dias.",
        "Alguns homens não gostavam de Daniel, e ele foi colocado numa cova com leões.",
        "Mas Deus mandou um anjo, que fechou a boca dos leões!",
        "No dia seguinte, Daniel saiu da cova sem nenhum machucado. Deus protegeu Daniel!",
      ],
      "5-7": [
        "Daniel trabalhava para o rei Dario e fazia tudo com tanta dedicação que o rei queria colocá-lo como chefe de todo o reino.",
        "Alguns homens ficaram com inveja. Eles convenceram o rei a assinar uma lei: durante trinta dias, ninguém poderia orar a nenhum deus, só ao rei. Quem desobedecesse seria jogado na cova dos leões.",
        "Daniel continuou orando a Deus três vezes por dia, ajoelhado perto da janela, como sempre fazia.",
        "Os homens contaram ao rei, e Daniel foi colocado na cova dos leões. O rei ficou muito triste e passou a noite sem dormir.",
        "Bem cedo, o rei correu até a cova e chamou Daniel. Daniel respondeu que Deus tinha enviado seu anjo para fechar a boca dos leões!",
        "Daniel saiu sem nenhum ferimento, porque tinha confiado em Deus. E o rei mandou que todos no reino respeitassem o Deus de Daniel.",
      ],
      "8-10": [
        "Quando Dario passou a governar, nomeou cento e vinte governadores e três administradores sobre eles. Daniel era um desses administradores e se destacava tanto que o rei planejava colocá-lo sobre todo o reino.",
        "Os outros administradores e governadores procuraram algum erro em Daniel, mas não encontraram nada, porque ele era fiel e honesto. Concluíram que só poderiam acusá-lo em algo relacionado à lei do seu Deus.",
        "Eles foram ao rei e propuseram um decreto: por trinta dias, quem fizesse pedidos a qualquer deus ou pessoa, a não ser ao rei, seria jogado na cova dos leões. O rei assinou, e segundo a lei dos medos e persas o decreto não podia ser mudado.",
        "Daniel soube do decreto, foi para casa e, com as janelas abertas na direção de Jerusalém, ajoelhou-se três vezes por dia para orar e agradecer a Deus, como sempre tinha feito.",
        "Os acusadores o viram orando e contaram ao rei. Dario ficou muito aflito e tentou até o pôr do sol encontrar um jeito de salvar Daniel, mas não conseguiu. Daniel foi lançado na cova, e o rei disse a ele que o Deus a quem servia continuamente o livraria. Uma pedra fechou a entrada.",
        "O rei passou a noite sem comer e sem dormir. De madrugada, foi depressa até a cova e chamou Daniel. Daniel respondeu que Deus enviara o seu anjo e fechara a boca dos leões. Ele foi tirado da cova sem nenhum ferimento, porque havia confiado em Deus, e o rei escreveu a todo o reino que o Deus de Daniel é o Deus vivo.",
      ],
    },
    lesson: {
      "2-4": "Daniel orava todos os dias. {nome}, você também pode conversar com Deus a qualquer hora!",
      "5-7": "Daniel não deixou de orar, mesmo quando era perigoso. {nome}, conversar com Deus todos os dias deixa nosso coração firme.",
      "8-10": "Daniel era honesto no trabalho e fiel em oração, mesmo sob pressão. {nome}, ter uma rotina com Deus ajuda a permanecer firme quando os outros pressionam para fazer o que é errado.",
    },
    practice: {
      "2-4": "Escolha um momento do dia (ao acordar ou antes de comer) para fazer uma oração curtinha.",
      "5-7": "Faça como Daniel: escolha três momentos do dia para conversar com Deus durante uma semana.",
      "8-10": "Monte um pequeno plano de oração: um horário fixo, um motivo de agradecimento e um pedido por alguém. Siga por sete dias.",
    },
    prayer: {
      short: "Querido Deus, eu gosto de conversar com o Senhor. Amém.",
      full: "Querido Deus, Daniel orava ao Senhor todos os dias. Ensina-me a conversar com o Senhor sempre e a fazer o que é certo, mesmo quando for difícil. Amém.",
    },
    questions: {
      "2-4": ["Quantos leões você vê?", "Os leões estão bravos ou calmos?"],
      "5-7": ["Quantas vezes por dia Daniel orava?", "Quem fechou a boca dos leões?", "Em que momento do dia você gosta de orar?"],
      "8-10": ["Por que os acusadores não encontraram erro em Daniel?", "Como o rei Dario se sentiu durante a noite?", "O que ajuda você a fazer o que é certo quando os outros não fazem?"],
    },
  },
  {
    id: "jonas",
    title: "Jonas e o grande peixe",
    reference: "Jonas 1–3",
    illustration: "jonah",
    paragraphs: {
      "2-4": [
        "Deus pediu a Jonas que fosse à cidade de Nínive.",
        "Mas Jonas fugiu num barco. Veio uma tempestade muito forte!",
        "Jonas caiu no mar, e Deus mandou um grande peixe para engolir Jonas.",
        "Lá dentro, Jonas orou. O peixe o colocou em terra firme, e Jonas foi a Nínive, como Deus queria.",
      ],
      "5-7": [
        "Deus pediu a Jonas que fosse à grande cidade de Nínive avisar o povo para deixar de fazer o mal. Mas Jonas não quis ir e entrou num navio que ia para bem longe.",
        "Deus mandou um vento forte, e uma grande tempestade sacudiu o navio. Os marinheiros ficaram com medo, enquanto Jonas dormia lá embaixo.",
        "Jonas contou que estava fugindo de Deus e disse que, se o jogassem no mar, a tempestade passaria. Os marinheiros tentaram remar até a terra, mas não conseguiram. Então jogaram Jonas no mar, e o mar se acalmou.",
        "Deus preparou um grande peixe que engoliu Jonas. Jonas ficou três dias e três noites dentro do peixe e, lá dentro, orou a Deus.",
        "Deus deu uma ordem ao peixe, e ele colocou Jonas na terra seca.",
        "Deus falou com Jonas outra vez, e dessa vez Jonas obedeceu. O povo de Nínive ouviu, se arrependeu e deixou o mal, e Deus teve compaixão da cidade.",
      ],
      "8-10": [
        "Deus mandou Jonas ir a Nínive, a grande cidade, e anunciar que a maldade dela havia chegado à presença de Deus. Jonas, porém, fugiu: desceu a Jope e embarcou num navio para Társis, na direção oposta.",
        "O Senhor lançou um grande vento sobre o mar, e a tempestade foi tão forte que o navio estava quase se partindo. Os marinheiros, com medo, clamavam cada um ao seu deus e jogavam a carga no mar. Jonas dormia no porão.",
        "Os marinheiros lançaram sortes para descobrir quem era o responsável, e a sorte caiu sobre Jonas. Ele contou que adorava o Senhor, o Deus que fez o mar e a terra, e que estava fugindo dEle. Disse que, se o lançassem ao mar, a tempestade cessaria. Eles ainda tentaram remar até a terra, sem sucesso; então o lançaram ao mar, e o mar se acalmou.",
        "O Senhor preparou um grande peixe para engolir Jonas, e ele ficou três dias e três noites dentro do peixe. Ali, Jonas orou ao Senhor, lembrando que a salvação vem de Deus. Então o Senhor falou ao peixe, e ele lançou Jonas em terra seca.",
        "Deus falou com Jonas pela segunda vez, e Jonas foi a Nínive. Anunciou que, em quarenta dias, a cidade seria destruída. O povo creu em Deus: todos, dos maiores aos menores, jejuaram, e até o rei pediu que cada um abandonasse o mau caminho.",
        "Deus viu que eles tinham deixado o mal e teve compaixão: não trouxe sobre a cidade a destruição anunciada. No capítulo 4, Deus ainda ensina Jonas sobre o seu amor por todas as pessoas.",
      ],
    },
    lesson: {
      "2-4": "Jonas aprendeu a obedecer. {nome}, Deus ama todas as pessoas!",
      "5-7": "Jonas tentou fugir, mas Deus deu a ele uma nova chance. {nome}, quando erramos, podemos pedir perdão e recomeçar com Deus.",
      "8-10": "Deus não desistiu de Jonas nem de Nínive. {nome}, Deus oferece novas chances e quer que a gente também deseje o bem até de quem é diferente de nós.",
    },
    practice: {
      "2-4": "Dê um abraço em alguém e diga: Deus ama você!",
      "5-7": "Se você tiver feito algo errado, peça desculpas hoje. Se alguém pedir desculpas a você, perdoe.",
      "8-10": "Pense em alguém com quem você não se dá bem e faça uma oração pedindo coisas boas para essa pessoa.",
    },
    prayer: {
      short: "Querido Deus, ajuda-me a obedecer ao Senhor. Amém.",
      full: "Querido Deus, o Senhor deu uma nova chance a Jonas. Perdoa-me quando eu errar e ajuda-me a obedecer e a amar todas as pessoas, como o Senhor ama. Amém.",
    },
    questions: {
      "2-4": ["Onde está o peixe grande?", "O mar está calmo ou agitado?"],
      "5-7": ["Para onde Deus mandou Jonas ir?", "O que Jonas fez dentro do peixe?", "O que fazemos quando erramos?"],
      "8-10": ["Por que Jonas fugiu para o lado contrário?", "Como o povo de Nínive respondeu à mensagem?", "O que essa história ensina sobre o amor de Deus por todas as pessoas?"],
    },
  },
  {
    id: "nascimento",
    title: "O nascimento de Jesus",
    reference: "Lucas 2",
    illustration: "nativity",
    paragraphs: {
      "2-4": [
        "Maria e José viajaram até a cidade de Belém.",
        "Lá nasceu o bebê Jesus! Maria o deitou numa manjedoura.",
        "Um anjo contou a boa notícia a uns pastores que cuidavam de ovelhas.",
        "Os pastores foram correndo ver Jesus e ficaram muito felizes!",
      ],
      "5-7": [
        "O imperador mandou que todas as pessoas fossem registradas, cada uma na sua cidade. Por isso, José e Maria viajaram de Nazaré até Belém.",
        "Enquanto estavam em Belém, chegou a hora de o bebê nascer. Maria teve seu filho, enrolou-o em panos e o deitou numa manjedoura, porque não havia lugar para eles na hospedaria.",
        "Perto dali, alguns pastores passavam a noite no campo cuidando das ovelhas. De repente, um anjo do Senhor apareceu, e uma luz brilhou ao redor deles.",
        "O anjo disse que não tivessem medo, pois trazia uma notícia de grande alegria: tinha nascido o Salvador, o Cristo, o Senhor! Eles o encontrariam deitado numa manjedoura.",
        "Então muitos anjos apareceram louvando a Deus. Os pastores foram depressa a Belém e encontraram Maria, José e o bebê, como o anjo tinha dito.",
        "Os pastores contaram a todos o que tinham ouvido e voltaram louvando a Deus. Maria guardava tudo isso no coração. O bebê recebeu o nome de Jesus.",
      ],
      "8-10": [
        "Naqueles dias, César Augusto, o imperador romano, ordenou um recenseamento. Cada pessoa devia se registrar na sua cidade de origem. José, que era descendente de Davi, foi de Nazaré, na Galileia, até Belém, na Judeia, a cidade de Davi, com Maria, que estava grávida.",
        "Enquanto estavam lá, Maria deu à luz o seu primeiro filho. Ela o envolveu em panos e o deitou numa manjedoura — o lugar onde os animais comiam —, porque não havia lugar para eles na hospedaria.",
        "Naquela região, havia pastores que passavam a noite no campo, vigiando o rebanho. Um anjo do Senhor apareceu a eles, a glória do Senhor brilhou ao redor, e ficaram com muito medo.",
        "O anjo disse que não temessem: ele trazia boas notícias de grande alegria para todo o povo. Naquele dia, na cidade de Davi, havia nascido o Salvador, que é Cristo, o Senhor. O sinal seria um bebê envolto em panos, deitado numa manjedoura. Logo apareceu uma multidão de anjos louvando a Deus.",
        "Quando os anjos voltaram ao céu, os pastores decidiram ir a Belém. Foram depressa e encontraram Maria, José e o bebê deitado na manjedoura. Depois espalharam o que tinha sido dito sobre o menino, e todos os que ouviam ficavam admirados.",
        "Maria guardava todas essas coisas e pensava nelas no coração. Os pastores voltaram glorificando e louvando a Deus por tudo o que tinham visto e ouvido. Oito dias depois, o menino recebeu o nome de Jesus, nome que o anjo tinha indicado antes mesmo de ele ser gerado.",
      ],
    },
    lesson: {
      "2-4": "Jesus veio ao mundo porque Deus nos ama. {nome}, que notícia feliz!",
      "5-7": "O nascimento de Jesus foi uma notícia de grande alegria. {nome}, assim como os pastores, você pode contar a outras pessoas que Deus nos ama.",
      "8-10": "O Salvador nasceu num lugar simples e a notícia foi dada primeiro a pastores humildes. {nome}, Deus valoriza cada pessoa, e o amor dEle não depende de riqueza ou importância.",
    },
    practice: {
      "2-4": "Embale um boneco ou uma almofada como Maria cuidou do bebê Jesus.",
      "5-7": "Conte a história do nascimento de Jesus para alguém da família, com suas palavras.",
      "8-10": "Faça algo gentil por alguém que costuma passar despercebido (um funcionário da escola, um vizinho) e agradeça a essa pessoa.",
    },
    prayer: {
      short: "Querido Deus, eu te agradeço pelo bebê Jesus. Amém.",
      full: "Querido Deus, eu te agradeço por ter enviado Jesus ao mundo. Enche o meu coração de alegria, como encheu o coração dos pastores, para que eu conte a todos sobre o seu amor. Amém.",
    },
    questions: {
      "2-4": ["Onde o bebê Jesus está deitado?", "Que animais você vê?"],
      "5-7": ["Para qual cidade Maria e José viajaram?", "Quem recebeu primeiro a notícia do anjo?", "Para quem você gostaria de contar essa notícia?"],
      "8-10": ["Por que José e Maria precisaram ir a Belém?", "Qual foi o sinal dado aos pastores?", "O que significa Maria guardar tudo no coração?"],
    },
  },
  {
    id: "tempestade",
    title: "Jesus acalma a tempestade",
    reference: "Marcos 4.35-41",
    illustration: "storm",
    paragraphs: {
      "2-4": [
        "Jesus e seus amigos entraram num barco.",
        "Jesus dormiu. Então veio um vento forte, e as ondas ficaram enormes!",
        "Os amigos acordaram Jesus, com muito medo.",
        "Jesus mandou o vento parar, e o mar ficou calminho. Jesus tem todo o poder!",
      ],
      "5-7": [
        "Num fim de tarde, depois de ensinar a multidão, Jesus convidou os discípulos para atravessarem o lago até o outro lado. Eles entraram no barco.",
        "No caminho, começou uma tempestade muito forte. As ondas batiam no barco, que estava se enchendo de água.",
        "Enquanto isso, Jesus dormia na parte de trás do barco, com a cabeça num travesseiro.",
        "Os discípulos o acordaram, assustados, perguntando se Ele não se importava que eles estivessem afundando.",
        "Jesus se levantou, repreendeu o vento e mandou o mar ficar quieto. O vento parou, e tudo ficou em completa calma.",
        "Jesus perguntou por que estavam com tanto medo e se ainda não tinham fé. Os discípulos ficaram admirados e perguntavam uns aos outros quem era aquele a quem até o vento e o mar obedeciam.",
      ],
      "8-10": [
        "Depois de um dia inteiro ensinando à beira do mar da Galileia, ao chegar a tarde, Jesus disse aos discípulos que passassem para o outro lado. Eles deixaram a multidão e levaram Jesus no barco; outros barcos também iam com eles.",
        "Levantou-se então uma forte ventania. As ondas se lançavam sobre o barco, de modo que ele já estava se enchendo de água.",
        "Jesus estava na popa, dormindo sobre um travesseiro. Os discípulos o acordaram e perguntaram se Ele não se importava com o fato de estarem morrendo.",
        "Jesus se levantou, repreendeu o vento e ordenou ao mar que se aquietasse. O vento cessou, e houve grande calma.",
        "Então Jesus perguntou aos discípulos por que eram tão medrosos e se ainda não tinham fé.",
        "Eles ficaram cheios de temor e perguntavam uns aos outros quem era Jesus, já que até o vento e o mar lhe obedeciam. A história mostra que Jesus tem autoridade sobre a criação e está presente mesmo no meio da tempestade.",
      ],
    },
    lesson: {
      "2-4": "Jesus estava no barco. {nome}, Jesus está sempre com você!",
      "5-7": "Mesmo na tempestade, Jesus estava no barco com os discípulos. {nome}, quando algo assustar você, lembre que Jesus é mais forte que qualquer tempestade.",
      "8-10": "Os discípulos tiveram medo porque olharam para as ondas. {nome}, nas 'tempestades' da vida — brigas, notas baixas, mudanças —, a fé nos ajuda a olhar para Jesus.",
    },
    practice: {
      "2-4": "Sopre como o vento forte e depois fique em silêncio, bem calminho, como o mar.",
      "5-7": "Quando sentir medo ou raiva, respire fundo três vezes e faça uma oração curta: Jesus, acalma o meu coração.",
      "8-10": "Escreva uma situação que traz preocupação para você e, ao lado, uma oração entregando essa situação a Jesus.",
    },
    prayer: {
      short: "Jesus, acalma o meu coração. Amém.",
      full: "Senhor Jesus, o vento e o mar obedecem a ti. Quando eu sentir medo, acalma o meu coração e aumenta a minha fé. Eu te agradeço porque o Senhor está sempre comigo. Amém.",
    },
    questions: {
      "2-4": ["Quem está no barco?", "Faça o barulho do vento!"],
      "5-7": ["Onde Jesus estava dormindo?", "O que aconteceu quando Jesus falou com o vento?", "O que você pode fazer quando sentir medo?"],
      "8-10": ["Por que os discípulos ficaram admirados?", "O que essa história mostra sobre quem Jesus é?", "Qual 'tempestade' você quer entregar a Jesus?"],
    },
  },
  {
    id: "paes",
    title: "Os pães e os peixes",
    reference: "João 6.1-14",
    illustration: "loaves",
    paragraphs: {
      "2-4": [
        "Muitas pessoas foram ouvir Jesus. Elas estavam com fome.",
        "Um menino tinha cinco pães e dois peixinhos.",
        "Jesus agradeceu a Deus e repartiu a comida.",
        "Todos comeram e ainda sobraram doze cestos cheios!",
      ],
      "5-7": [
        "Uma multidão enorme seguia Jesus, porque tinha visto Ele curar muitas pessoas doentes. Jesus subiu um monte e se sentou com os discípulos.",
        "Vendo tanta gente, Jesus perguntou a Filipe onde poderiam comprar pão para todos. Filipe respondeu que nem muito dinheiro daria para cada um comer um pouquinho.",
        "André contou que havia ali um menino com cinco pães de cevada e dois peixinhos, mas perguntou o que era aquilo para tanta gente.",
        "Jesus mandou o povo se sentar na grama. Eram cerca de cinco mil homens. Ele pegou os pães, agradeceu a Deus e os repartiu. Fez o mesmo com os peixes, e todos comeram quanto quiseram.",
        "Depois, Jesus pediu que juntassem os pedaços que sobraram, para que nada se perdesse. Encheram doze cestos!",
        "O povo ficou admirado com o que Jesus tinha feito.",
      ],
      "8-10": [
        "Jesus atravessou o mar da Galileia, e uma grande multidão o seguia, porque via os sinais que Ele fazia ao curar os doentes. Jesus subiu a um monte e sentou-se com os discípulos. A festa da Páscoa estava próxima.",
        "Ao ver a multidão chegando, Jesus perguntou a Filipe onde comprariam pão para tanta gente. Ele perguntou isso para pôr Filipe à prova, pois já sabia o que ia fazer. Filipe calculou que duzentos denários de pão não bastariam para que cada um recebesse um pedaço.",
        "André, irmão de Simão Pedro, contou que havia ali um rapaz com cinco pães de cevada e dois peixinhos — mas o que era aquilo para tanta gente?",
        "Jesus mandou que o povo se assentasse; havia muita grama naquele lugar, e só os homens eram cerca de cinco mil. Jesus tomou os pães, deu graças e os distribuiu; fez o mesmo com os peixes, tanto quanto queriam.",
        "Quando todos estavam satisfeitos, Jesus mandou recolher os pedaços que sobraram, para que nada fosse desperdiçado. Com os pedaços dos cinco pães de cevada, encheram doze cestos.",
        "Ao ver esse sinal, as pessoas diziam que Jesus era, de fato, o Profeta que devia vir ao mundo. O pouco que o rapaz ofereceu, nas mãos de Jesus, alimentou uma multidão.",
      ],
    },
    lesson: {
      "2-4": "O menino repartiu o seu lanche. {nome}, repartir deixa todo mundo feliz!",
      "5-7": "O menino ofereceu o pouco que tinha, e Jesus fez algo enorme com isso. {nome}, o que você compartilha com amor pode abençoar muita gente.",
      "8-10": "O rapaz não tinha muito, mas entregou o que tinha. {nome}, seus talentos e atitudes, mesmo que pareçam pequenos, podem fazer grande diferença quando oferecidos a Deus.",
    },
    practice: {
      "2-4": "Reparta hoje um lanche ou um brinquedo com alguém.",
      "5-7": "Separe um brinquedo ou uma roupa em bom estado para doar, com a ajuda de um adulto.",
      "8-10": "Descubra uma necessidade perto de você (na escola, na igreja, no bairro) e ofereça ajuda com algo que você sabe fazer.",
    },
    prayer: {
      short: "Querido Deus, eu te agradeço pela comida de cada dia. Amém.",
      full: "Querido Deus, eu te agradeço pela comida de cada dia. Ensina-me a repartir o que tenho com alegria, como o menino que entregou seus pães e peixes a Jesus. Amém.",
    },
    questions: {
      "2-4": ["Conte os pães da figura!", "Quantos peixinhos você vê?"],
      "5-7": ["Quantos pães e peixes o menino tinha?", "Quantos cestos sobraram?", "O que você pode repartir esta semana?"],
      "8-10": ["Por que Jesus perguntou a Filipe onde comprar pão?", "Por que Jesus mandou recolher as sobras?", "Que talento seu você pode oferecer para ajudar alguém?"],
    },
  },
  {
    id: "criancas",
    title: "Jesus abençoa as crianças",
    reference: "Marcos 10.13-16",
    illustration: "children",
    paragraphs: {
      "2-4": [
        "Muitas famílias levavam as crianças para ver Jesus.",
        "Os discípulos acharam que Jesus estava ocupado demais.",
        "Mas Jesus disse que as crianças podiam vir até Ele!",
        "Jesus abraçou as crianças e as abençoou. Jesus ama as crianças!",
      ],
      "5-7": [
        "Um dia, algumas pessoas trouxeram crianças até Jesus para que Ele tocasse nelas e as abençoasse.",
        "Os discípulos repreenderam essas pessoas. Talvez achassem que Jesus tinha coisas mais importantes para fazer.",
        "Quando Jesus viu isso, ficou indignado. Ele disse aos discípulos que deixassem as crianças virem até Ele e não as impedissem, porque o Reino de Deus pertence aos que são como elas.",
        "Jesus também ensinou que quem não receber o Reino de Deus como uma criança não entrará nele.",
        "Então Jesus pegou as crianças no colo, colocou as mãos sobre elas e as abençoou.",
        "Para Jesus, as crianças são muito importantes!",
      ],
      "8-10": [
        "Enquanto Jesus ensinava na região da Judeia, algumas pessoas começaram a trazer crianças até Ele, para que as tocasse e abençoasse.",
        "Os discípulos repreenderam quem as trazia. Naquela época, as crianças muitas vezes não eram tratadas como importantes, e os discípulos provavelmente achavam que estavam protegendo o tempo do Mestre.",
        "Ao ver isso, Jesus ficou indignado. Disse aos discípulos que deixassem as crianças virem a Ele e não as impedissem, pois o Reino de Deus pertence aos que são semelhantes a elas.",
        "Jesus acrescentou um ensino importante: quem não receber o Reino de Deus como uma criança — com confiança e simplicidade — de modo nenhum entrará nele.",
        "Então Jesus tomou as crianças nos braços, impôs as mãos sobre elas e as abençoou.",
        "Esse momento mostra o carinho de Jesus e ensina que, para Ele, ninguém é pequeno demais para ser amado e ouvido.",
      ],
    },
    lesson: {
      "2-4": "Jesus ama as crianças. {nome}, Jesus ama você!",
      "5-7": "Jesus abriu os braços para as crianças. {nome}, você é importante para Jesus e pode falar com Ele sempre.",
      "8-10": "Jesus valorizou as crianças quando muitos não davam atenção a elas. {nome}, você é importante para Deus, e sua confiança simples é um exemplo até para os adultos.",
    },
    practice: {
      "2-4": "Dê um abraço bem gostoso em alguém da sua família.",
      "5-7": "Convide um colega que está sozinho para brincar com você.",
      "8-10": "Dê atenção a uma criança menor (um irmão, primo ou vizinho): brinque, leia ou ajude em alguma tarefa.",
    },
    prayer: {
      short: "Jesus, eu te agradeço porque o Senhor me ama. Amém.",
      full: "Senhor Jesus, eu te agradeço porque o Senhor ama as crianças e me ama também. Ajuda-me a confiar no Senhor de todo o coração e a tratar todos com carinho. Amém.",
    },
    questions: {
      "2-4": ["Quem está abraçando as crianças?", "Mostre como você dá um abraço!"],
      "5-7": ["O que os discípulos fizeram?", "O que Jesus fez com as crianças?", "Como você se sente sabendo que Jesus ama você?"],
      "8-10": ["Por que Jesus ficou indignado?", "O que significa receber o Reino de Deus como uma criança?", "Como você pode tratar com carinho quem é menor que você?"],
    },
  },
];

export const BOOK_TEXTS = {
  coverSubtitle: "Histórias bíblicas, orações e atividades",
  ownerTitle: "Este livro pertence a",
  welcome: {
    "2-4": [
      "Olá, {nome}!",
      "Este livro foi feito especialmente para você.",
      "Aqui tem dez histórias da Bíblia, orações e atividades para fazer com a sua família.",
      "Deus ama você!",
    ],
    "5-7": [
      "Olá, {nome}!",
      "Este livro foi preparado especialmente para você. Nas próximas páginas, você vai conhecer dez histórias da Bíblia que mostram como Deus cuida do seu povo.",
      "Depois de cada história, há uma ideia para pensar, uma oração e algo para praticar. No final, tem atividades para colorir e brincar.",
      "Boa leitura, {nome}! Deus ama você.",
    ],
    "8-10": [
      "Olá, {nome}!",
      "Este livro foi preparado especialmente para você. Ele reúne dez histórias da Bíblia, contadas com palavras simples, desde a criação do mundo até Jesus abençoando as crianças.",
      "Em cada história você vai encontrar uma lição para pensar, um desafio prático, uma oração e perguntas para conversar com sua família. No final, há atividades para colorir, procurar palavras e escrever.",
      "Ao lado de cada título está a referência bíblica. Que tal ler também o texto na Bíblia com alguém da família?",
      "Boa leitura, {nome}!",
    ],
  } as AgeTexts<string[]>,
  forFamily: [
    "As histórias deste livro foram recontadas com palavras simples, adequadas à faixa etária escolhida. Elas não são citações literais da Bíblia: as falas dos personagens aparecem contadas pelo narrador.",
    "Ao lado de cada título há a referência bíblica (livro, capítulo e versículos). Recomendamos ler o texto bíblico completo na tradução de sua preferência e conversar com a criança sobre ele.",
    "Sugestão de uso: leia uma história por dia, faça a oração juntos e escolha uma das perguntas para conversar. As atividades práticas podem ser feitas durante a semana.",
    "Algumas histórias falam de situações de medo ou perigo. Leia antes, adapte o ritmo e acolha as perguntas da criança.",
  ],
  bedtime: {
    title: "Oração antes de dormir",
    "2-4":
      "Querido Deus, o dia acabou e agora eu vou dormir. Eu te agradeço pela minha família, pelos meus brinquedos e pela comida. Cuida de mim esta noite. Eu sou {nome} e o Senhor me ama. Amém.",
    "5-7":
      "Querido Deus, eu te agradeço por este dia. Eu te agradeço pela minha família, pelos meus amigos e por tudo o que aprendi hoje. Se eu fiz algo errado, perdoa-me. Cuida de mim enquanto eu durmo e de todas as pessoas que eu amo. Eu, {nome}, quero estar sempre pertinho do Senhor. Amém.",
    "8-10":
      "Senhor, eu te agradeço por este dia e por tudo o que vivi nele. Perdoa os meus erros e ajuda-me a perdoar quem me magoou. Coloco nas suas mãos as minhas preocupações e as pessoas que eu amo. Dá-me uma noite de descanso tranquilo e um coração disposto a te seguir amanhã. Eu, {nome}, confio em ti. Em nome de Jesus, amém.",
  } as { title: string } & AgeTexts<string>,
  closing: {
    title: "Até a próxima história!",
    text: "{nome}, você chegou ao fim deste livro, mas pode ler estas histórias muitas e muitas vezes. Lembre-se sempre: Deus criou você, cuida de você e ama você.",
  },
  credits:
    "Textos recontados e ilustrações originais criados para esta edição. As histórias são adaptações para crianças; consulte as referências indicadas para ler o texto bíblico completo. Fontes Fredoka e Nunito, licenciadas sob a SIL Open Font License.",
};
