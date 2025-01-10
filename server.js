const express = require('express');
const cors = require('cors');
const path = require('path'); 
const mongoose = require('mongoose');
const multer = require('multer'); // Biblioteca para upload de arquivos
const fs = require('fs'); // Para manipulação de arquivos no sistema
const app = express();
const port = 3000;

// Middleware para processar JSON no corpo das requisições
app.use(express.json());
app.use(cors());

// Conectando ao MongoDB
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Conectado ao MongoDB'))
  .catch(err => console.error('Erro ao conectar ao MongoDB:', err));

// Configuração do multer para salvar imagens na pasta `uploads`
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Pasta onde as imagens serão salvas
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Nome único baseado na data
  },
});

app.use(express.static(path.join(__dirname, 'public')));
const upload = multer({ storage });

// Esquema e modelo Content para gerenciar seções
const contentSchema = new mongoose.Schema({
  section: { type: String, required: true },
  color: String, 
  images: [String], 
  title: String, 
  description: String,
});

const Content = mongoose.model('Content', contentSchema);

// Middleware para servir arquivos estáticos (imagens)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.delete('/content/gallery', async (req, res) => {
  try {
    const { imageUrl } = req.query; // URL da imagem enviada no parâmetro
    if (!imageUrl) {
      return res.status(400).json({ message: 'URL da imagem não fornecida' });
    }

    // Localiza a galeria correspondente
    const gallery = await Content.findOne({ section: 'gallery' });
    if (!gallery) {
      return res.status(404).json({ message: 'Galeria não encontrada' });
    }

    // Remove a imagem da lista
    gallery.images = gallery.images.filter((image) => image !== imageUrl);

    // Caminho físico do arquivo
    const filePath = path.join(__dirname, imageUrl.replace('/uploads/', 'uploads/'));

    // Verifica se o arquivo existe e o remove
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Salva a galeria atualizada
    await gallery.save();

    res.json({ images: gallery.images }); // Retorna a galeria atualizada
  } catch (error) {
    console.error('Erro ao remover imagem:', error);
    res.status(500).json({ message: 'Erro ao remover imagem' });
  }
});

app.put('/content/gallery', upload.array('images', 10), async (req, res) => {
  try {
    // Localizar ou criar a galeria
    let gallery = await Content.findOne({ section: 'gallery' });
    if (!gallery) {
      gallery = new Content({ section: 'gallery', images: [] });
    }

    // Adicionar os caminhos das novas imagens
    const newImages = req.files.map((file) => `/uploads/${file.filename}`);
    gallery.images.push(...newImages);

    // Salvar a galeria atualizada
    await gallery.save();

    res.json({ images: gallery.images });
  } catch (error) {
    console.error('Erro ao adicionar imagens à galeria:', error);
    res.status(500).json({ message: 'Erro ao adicionar imagens à galeria' });
  }
});


app.put('/content/:section', async (req, res) => {
  const { section } = req.params;
  const { title, description } = req.body;

  try {
    const updatedContent = await Content.findOneAndUpdate(
      { section },
      { title, description },
      { new: true, upsert: true }
    );
    res.json(updatedContent);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar conteúdo da seção' });
  }
});

app.get('/content/:section', async (req, res) => {
  const { section } = req.params;
  try {
    const content = await Content.findOne({ section });
    if (!content) {
      return res.status(404).json({ message: 'Seção não encontrada' });
    }
    res.json(content);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao obter conteúdo da seção' });
  }
});

// Esquema para posts
const postSchema = new mongoose.Schema({
  title: String,
  content: String,
  imageUrl: String, // Campo para armazenar a URL da imagem
  createdAt: { type: Date, default: Date.now }, // Forma correta
});

const Post = mongoose.model('Post', postSchema);

// API para obter os posts
app.get('/blog', async (req, res) => {
  try {
    const posts = await Post.find();
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao carregar posts' });
  }
});

// API para criar um post com imagem
app.post('/blog', upload.single('image'), async (req, res) => {
  const { title, content } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

  const post = new Post({
    title,
    content,
    imageUrl,
  });

  try {
    await post.save();
    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao criar post' });
  }
});

// API para atualizar um post (incluindo a imagem)
app.put('/blog/:id', upload.single('image'), async (req, res) => {
  const { title, content } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { title, content, imageUrl },
      { new: true }
    );

    if (!post) {
      return res.status(404).json({ message: 'Post não encontrado' });
    }

    res.json(post);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao editar post' });
  }
});

// API para deletar um post
app.delete('/blog/:id', async (req, res) => {
  try {
    const post = await Post.findByIdAndDelete(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post não encontrado' });
    }
    res.json({ message: 'Post excluído com sucesso' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao excluir post' });
  }
});

// Serve arquivos estáticos como CSS, imagens e JS
app.use(express.static(path.join(__dirname, 'public')));

// Rota para a página inicial
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor backend rodando em http://localhost:3000/`);
});
