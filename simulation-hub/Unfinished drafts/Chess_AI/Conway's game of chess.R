# Install required packages if not already installed
# install.packages(c("shiny", "ggplot2", "dplyr", "gifski"))

library(shiny)
library(ggplot2)
library(dplyr)
library(gifski)

# --- Define Simulation Functions ---

# Define board dimensions and simulation parameters
board_size <- 64
n_pieces <- 20 # Number of pieces to simulate

# Define chess piece types and colors
piece_types <- c("King", "Knight", "Rook", "Bishop")
piece_colors <- c("King" = "red", "Knight" = "blue", "Rook" = "green", "Bishop" = "purple")

# Function to compute valid moves for a piece
get_valid_moves <- function(piece, board_size) {
  x <- piece$x
  y <- piece$y
  moves <- data.frame(x = integer(), y = integer())

  if (piece$type == "King") {
    for (dx in -1:1) {
      for (dy in -1:1) {
        if (dx == 0 && dy == 0) next
        new_x <- x + dx
        new_y <- y + dy
        if (new_x >= 1 && new_x <= board_size && new_y >= 1 && new_y <= board_size) {
          moves <- rbind(moves, data.frame(x = new_x, y = new_y))
        }
      }
    }
  } else if (piece$type == "Knight") {
    offsets <- data.frame(
      dx = c(2, 2, -2, -2, 1, 1, -1, -1),
      dy = c(1, -1, 1, -1, 2, -2, 2, -2)
    )
    for (i in 1:nrow(offsets)) {
      new_x <- x + offsets$dx[i]
      new_y <- y + offsets$dy[i]
      if (new_x >= 1 && new_x <= board_size && new_y >= 1 && new_y <= board_size) {
        moves <- rbind(moves, data.frame(x = new_x, y = new_y))
      }
    }
  } else if (piece$type == "Rook") {
    for (new_x in 1:board_size) {
      if (new_x != x) {
        moves <- rbind(moves, data.frame(x = new_x, y = y))
      }
    }
    for (new_y in 1:board_size) {
      if (new_y != y) {
        moves <- rbind(moves, data.frame(x = x, y = new_y))
      }
    }
  } else if (piece$type == "Bishop") {
    for (dx in -board_size:board_size) {
      if (dx == 0) next
      new_x <- x + dx
      new_y <- y + dx
      if (new_x >= 1 && new_x <= board_size && new_y >= 1 && new_y <= board_size) {
        moves <- rbind(moves, data.frame(x = new_x, y = new_y))
      }
      new_y2 <- y - dx
      if (new_x >= 1 && new_x <= board_size && new_y2 >= 1 && new_y2 <= board_size) {
        moves <- rbind(moves, data.frame(x = new_x, y = new_y2))
      }
    }
  }
  unique(moves)
}

# Function to generate a ggplot of the current board state
plot_simulation <- function(pieces, board_size) {
  board_tiles <- expand.grid(x = 1:board_size, y = 1:board_size)
  ggplot() +
    geom_tile(
      data = board_tiles, aes(x = x, y = y),
      fill = "white", color = "grey90"
    ) +
    geom_point(
      data = pieces, aes(x = x, y = y, color = type),
      size = 4
    ) +
    scale_color_manual(values = piece_colors) +
    coord_fixed() +
    theme_void() +
    theme(legend.position = "right") +
    ggtitle("Chess Pieces Simulation")
}

# Simulation function that records frames for GIF creation
simulate_and_record <- function(pieces, board_size, max_steps = 200, img_dir) {
  frame_paths <- c()
  step <- 0

  # Create a frame for the initial state
  p <- plot_simulation(pieces, board_size)
  frame_file <- file.path(img_dir, sprintf("frame_%04d.png", step))
  ggsave(frame_file, p, width = 6, height = 6, dpi = 100)
  frame_paths <- c(frame_paths, frame_file)

  while (nrow(pieces) > 1 && step < max_steps) {
    step <- step + 1
    # Randomize turn order
    order_ids <- sample(pieces$id)
    for (id in order_ids) {
      if (!(id %in% pieces$id)) next

      piece <- pieces[pieces$id == id, ]
      moves <- get_valid_moves(piece, board_size)
      if (nrow(moves) == 0) next

      chosen_move <- moves[sample(nrow(moves), 1), ]

      # Capture any piece(s) at the new position
      colliding_ids <- pieces$id[pieces$x == chosen_move$x & pieces$y == chosen_move$y & pieces$id != id]
      if (length(colliding_ids) > 0) {
        pieces <- pieces[!(pieces$id %in% colliding_ids), ]
      }
      pieces[pieces$id == id, c("x", "y")] <- chosen_move

      # Record a frame after each move
      p <- plot_simulation(pieces, board_size)
      frame_file <- file.path(img_dir, sprintf("frame_%04d.png", step))
      ggsave(frame_file, p, width = 6, height = 6, dpi = 100)
      frame_paths <- c(frame_paths, frame_file)

      if (nrow(pieces) <= 1) break
    }
  }
  frame_paths
}

# --- Define the Shiny App ---

ui <- fluidPage(
  titlePanel("Chess Pieces Simulation"),
  sidebarLayout(
    sidebarPanel(
      actionButton("run_sim", "Run Simulation")
    ),
    mainPanel(
      imageOutput("simGif"),
      br(),
      textOutput("status")
    )
  )
)

server <- function(input, output, session) {
  sim_gif_path <- reactiveVal(NULL)
  status_msg <- reactiveVal("Press 'Run Simulation' to begin.")

  observeEvent(input$run_sim, {
    status_msg("Simulation running...")

    # Create a temporary directory to store frames
    img_dir <- tempdir()

    # Initialize pieces with random positions and types
    pieces <- data.frame(
      id = 1:n_pieces,
      type = sample(piece_types, n_pieces, replace = TRUE),
      x = sample(1:board_size, n_pieces, replace = TRUE),
      y = sample(1:board_size, n_pieces, replace = TRUE),
      stringsAsFactors = FALSE
    )

    # Run simulation with a progress indicator
    frame_paths <- NULL
    withProgress(message = "Simulating...", value = 0, {
      # We set an arbitrary number of progress increments
      n_inc <- 200
      for (i in 1:n_inc) {
        # Simulate small chunks by calling the simulation function in one go
        # For this example, we simulate the entire process in one call,
        # but we update progress gradually.
        if (i == 1) {
          frame_paths <- simulate_and_record(pieces, board_size, max_steps = 200, img_dir = img_dir)
        }
        incProgress(1 / n_inc)
        Sys.sleep(0.01) # short delay to show progress updates
      }
    })

    # Create GIF file in temp directory
    gif_file <- file.path(img_dir, "simulation.gif")
    gifski(png_files = frame_paths, gif_file = gif_file, width = 300, height = 300, delay = 0)

    sim_gif_path(gif_file)
    status_msg("Simulation complete!")
  })

  output$status <- renderText({
    status_msg()
  })

  output$simGif <- renderImage(
    {
      req(sim_gif_path())
      list(
        src = sim_gif_path(),
        contentType = "image/gif",
        width = 300,
        height = 300,
        alt = "Simulation GIF"
      )
    },
    deleteFile = FALSE
  )
}

shinyApp(ui, server)
