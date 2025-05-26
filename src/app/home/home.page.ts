import { Component, OnInit } from '@angular/core';
import { IonicModule, ToastController } from '@ionic/angular'; // Importa IonicModule directamente
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { HttpClient } from '@angular/common/http';
import { getFirestore, collection, addDoc } from 'firebase/firestore'; // Importa Firestore de Firebase
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule], // Importa IonicModule aquí para Standalone
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit {
  pokemons: any[] = [];
  filteredPokemons: any[] = [];
  offset = 0;
  limit = 20;
  loading = false;
  searchTerm: string = '';
  isFiltering: boolean = false;

  constructor(
    private http: HttpClient,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    this.loadPokemons();
  }

  loadPokemons(event?: any) {
    if (this.loading) return;
    this.loading = true;

    this.http
      .get<any>(`https://pokeapi.co/api/v2/pokemon?offset=${this.offset}&limit=${this.limit}`)
      .subscribe((res) => {
        const pokemonRequests = res.results.map((pokemon: any) =>
          this.http.get<any>(pokemon.url).toPromise()
        );

        Promise.all(pokemonRequests).then((pokemonDetails) => {
          this.pokemons = [...this.pokemons, ...pokemonDetails];
          this.filteredPokemons = [...this.pokemons];
          this.offset += this.limit;
          this.loading = false;

          if (event) event.target.complete();
          if (res.next === null && event) event.target.disabled = true;
        }).catch(() => {
          this.loading = false;
          if (event) event.target.complete();
        });
      });
  }

  filterPokemons() {
    const term = this.searchTerm.trim().toLowerCase();
    this.isFiltering = true;

    if (!term) {
      this.filteredPokemons = [...this.pokemons];
      this.isFiltering = false;
      return;
    }

    this.filteredPokemons = this.pokemons.filter(pokemon =>
      pokemon.name.toLowerCase().includes(term)
    );
    this.isFiltering = false;
  }

  resetSearch() {
    this.searchTerm = '';
    this.filteredPokemons = [...this.pokemons];
  }

  getImageUrl(pokemon: any): string {
    return pokemon?.sprites?.front_default ?? '';
  }

async guardarFavorito(pokemon: any) {
  const db = getFirestore(); // Inicializa Firestore manualmente
  const favoritosRef = collection(db, 'favoritos'); // Firestore collection

  try {
    await addDoc(favoritosRef, {
      nombre: pokemon.name,
      tipos: pokemon.types ? pokemon.types.map((t: any) => t.type.name) : [],
      habilidades: pokemon.abilities ? pokemon.abilities.map((a: any) => a.ability.name) : [],
      estadisticas: pokemon.stats ? pokemon.stats.map((s: any) => ({
        nombre: s.stat.name,
        valor: s.base_stat
      })) : [],
      imagen: this.getImageUrl(pokemon),
      fecha: new Date().toISOString()
    });

    const toast = await this.toastCtrl.create({
      message: `${pokemon.name} guardado como favorito`,
      duration: 1500,
      color: 'success',
    });
    await toast.present();
  } catch (error) {
    const toast = await this.toastCtrl.create({
      message: 'Error al guardar el Pokémon',
      duration: 1500,
      color: 'danger',
    });
    await toast.present();
    console.error('Error al guardar en Firestore:', error);
  }
}

}
