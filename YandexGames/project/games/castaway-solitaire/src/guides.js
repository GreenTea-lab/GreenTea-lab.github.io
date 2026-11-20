const controls = {
  ru: [
    {title:'Камера и масштаб',icon:'scene',rows:[
      ['Мышь','Зажмите правую кнопку и ведите мышь, чтобы повернуть или наклонить камеру. Зажмите левую и ведите, чтобы сдвинуть вид по острову. Колесо меняет масштаб.'],
      ['Телефон','Проведите одним пальцем, чтобы повернуть камеру. Двигайте двумя пальцами вместе, чтобы сдвинуть вид. Сведите или разведите пальцы, чтобы изменить масштаб.'],
    ]},
    {title:'Жители и постройки',icon:'palm',rows:[
      ['Жители и животные','Нажмите на Робинзона, чтобы он ответил. Нажмите на попугая, краба или другое животное, чтобы услышать его звук.'],
      ['Стройка','Нажмите на постройку или отмеченную площадку. В карточке видны этап, стоимость и баланс звёзд. Жители и животные появляются по мере развития острова.'],
      ['Дневник','В «Дневнике» внизу можно узнать, кто уже на острове, посмотреть задания и забрать награды.'],
    ]},
    {title:'Управление в партии',icon:'cards',rows:[
      ['Ход','Нажмите на открытую карту на поле. Она должна быть на один ранг выше или ниже нижней карты. Масть не важна.'],
      ['Добор и отмена','Нажмите на колоду, чтобы взять карту. Кнопка со стрелкой отменяет ход. На компьютере можно взять карту пробелом и отменить ход клавишей Z.'],
      ['Размер и фон','Масштаб карт и кнопка «Фон» находятся над полем.'],
    ]},
  ],
  en: [
    {title:'Camera and zoom',icon:'scene',rows:[
      ['Mouse','Hold the right button and drag to orbit or tilt the camera. Hold the left button and drag to move the view across the island. Scroll to zoom.'],
      ['Touch','Drag with one finger to orbit. Move two fingers together to pan. Pinch or spread two fingers to zoom.'],
    ]},
    {title:'Residents and buildings',icon:'palm',rows:[
      ['Residents and animals','Tap Robinson to hear from him. Tap a parrot, crab or another animal to hear its sound.'],
      ['Building','Tap a building or a marked plot to see its current stage, cost and your star balance. More residents and animals arrive as you develop the island.'],
      ['Journal','Open the Journal at the bottom to meet the islanders, view tasks and claim rewards.'],
    ]},
    {title:'Playing solitaire',icon:'cards',rows:[
      ['Play a card','Tap an uncovered card one rank above or below the card at the bottom. Suit doesn’t matter.'],
      ['Draw and undo','Tap the stock to draw a card. The arrow undoes a move. On a computer, press Space to draw or Z to undo.'],
      ['Size and scene','The card size and Scene controls are above the cards.'],
    ]},
  ],
};

const decor = {
  ru: [
    {title:'Выберите предмет и место',icon:'bag',rows:[
      ['Предмет','Откройте «Декор» внизу и выберите предмет. Траву можно посадить бесплатно.'],
      ['Предпросмотр','Наведите курсор или ведите пальцем по клеткам, чтобы увидеть модель. Зелёная подсветка показывает, куда она поместится. Нажмите на клетку, чтобы зафиксировать место.'],
      ['Камера','Во время предпросмотра правая кнопка всё так же поворачивает камеру. На телефоне двумя пальцами можно сдвинуть вид и изменить масштаб.'],
    ]},
    {title:'Поверните и поставьте',icon:'check',rows:[
      ['Поворот','Нажмите ↻ после фиксации, чтобы повернуть предмет на 90°. Подсветка покажет все клетки под ним.'],
      ['Подтверждение','Нажмите «Поставить». Монеты спишутся в этот момент.'],
      ['Склад','Кнопка «Убрать» переносит предмет на склад. Поставить его снова можно бесплатно. При стройке предметы, оказавшиеся под зданием, тоже отправляются на склад.'],
    ]},
  ],
  en: [
    {title:'Choose an item and a spot',icon:'bag',rows:[
      ['Item','Open Decor at the bottom and pick an item. Grass is free to plant.'],
      ['Preview','Hover or move a finger across the tiles to see the model. The green highlight shows where it fits. Tap a tile to lock the spot.'],
      ['Camera','Right-drag still orbits during the preview. On touch screens, use two fingers to pan or zoom.'],
    ]},
    {title:'Rotate and place',icon:'check',rows:[
      ['Rotate','After locking the spot, press ↻ to rotate the item 90°. The highlight shows every tile it covers.'],
      ['Confirm','Press Place to confirm and spend the coins.'],
      ['Storage','Use Store to put an item away. Placing it again is free. Construction also sends any covered items to storage.'],
    ]},
  ],
};

export const GUIDES = { controls, decor };
