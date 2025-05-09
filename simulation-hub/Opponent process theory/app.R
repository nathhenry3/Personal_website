# app.R

# ─── Packages & Palette ─────────────────────────────────────────────────────────
library(shiny)
library(tidyverse)
library(mrgsolve)
library(patchwork)
library(magrittr)
library(latex2exp)
library(RColorBrewer)
library(viridis)

# custom blues
myblues <- rev(brewer.pal(n = 9, name = "Blues")[c(4, 5, 7, 9)])

# ─── C++ Model & Compilation ────────────────────────────────────────────────────
cpp_code <- "
$PARAM
  k_DB = 0, k_apk = 0, k_bpk = 0,
  E0_a = 0, Emax_a = 0, EC50_a = 0, gamma_a = 0,
  E0_b = 0, Emax_b = 0, EC50_b = 0, gamma_b = 0,
  infuse = 1
$CMT DB, apk, apd, bpk, bpd, H
$MAIN D_DB = infuse;
$ODE
  dxdt_DB  = -k_DB * DB;
  dxdt_apk =  k_DB * DB - k_apk * apk;
  dxdt_bpk =  k_apk * apk - k_bpk * bpk;
  dxdt_apd =  E0_a +
    (Emax_a * pow(apk, gamma_a)) /
    (pow(EC50_a, gamma_a) + pow(apk, gamma_a)) - apd;
  dxdt_bpd =  E0_b +
    (Emax_b * pow(bpk, gamma_b)) /
    (pow(EC50_b, gamma_b) + pow(bpk, gamma_b)) - bpd;
  dxdt_H   =  apd - bpd - H;
"
mod <- mcode("Cppcode", cpp_code)

# ─── opponentprocess() ──────────────────────────────────────────────────────────
opponentprocess <- function(
    ii = 100000,
    sim_length = 4000,
    plot_biophase = FALSE,
    k_DB = 10, k_apk = 0.02, k_bpk = 0.004,
    E0_a = 0, Emax_a = 1, EC50_a = 1, gamma_a = 2,
    E0_b = 0, Emax_b = 1, EC50_b = 3, gamma_b = 2,
    infuse = 1) {
  params <- tibble(
    k_DB, k_apk, k_bpk, E0_a, Emax_a, EC50_a, gamma_a,
    E0_b, Emax_b, EC50_b, gamma_b, infuse
  ) %>% rowid_to_column("ID")

  events <- ev(amt = 1, rate = -2, ii = ii, ID = params$ID, addl = 999999)
  out <- mrgsim(mod, events, params, end = sim_length, maxsteps = 50000)

  # AUC and freq
  AUC_H <- out@data %>%
    group_by(ID) %>%
    summarise(AUC = sum(H), freq = 1 / ii)

  # time‐series plot at this ii
  time_plot <- out@data %>%
    ggplot(aes(time, H, colour = factor(ID))) +
    geom_hline(yintercept = 0, linetype = "dashed") +
    geom_line() +
    scale_color_manual(values = myblues) +
    ggtitle(bquote("Dose freq =" ~ .(round(1 / ii, 5)) ~ min^-1)) +
    xlab("Time (min)") +
    ylab(bquote(H[a * "," * b])) +
    theme_bw() +
    theme(legend.position = "none")

  # biophase PD curves
  if (plot_biophase) {
    pd_seq <- tibble(dose = seq(0, 50, 0.5))
    for (i in seq_len(nrow(params))) {
      pd_seq <- pd_seq %>%
        mutate(
          !!paste0("apd", i) := params$E0_a[i] +
            (params$Emax_a[i] * dose^params$gamma_a[i]) /
              (params$EC50_a[i]^params$gamma_a[i] + dose^params$gamma_a[i]),
          !!paste0("bpd", i) := params$E0_b[i] +
            (params$Emax_b[i] * dose^params$gamma_b[i]) /
              (params$EC50_b[i]^params$gamma_b[i] + dose^params$gamma_b[i])
        )
    }
    apd_plot <- pd_seq %>%
      pivot_longer(starts_with("apd"), names_to = "ID", values_to = "val") %>%
      ggplot(aes(dose, val, colour = ID)) +
      geom_line() +
      scale_color_manual(values = myblues) +
      theme_bw() +
      theme(legend.position = "none") +
      xlab(bquote(a[pk])) +
      ylab("apd")

    bpd_plot <- pd_seq %>%
      pivot_longer(starts_with("bpd"), names_to = "ID", values_to = "val") %>%
      ggplot(aes(dose, val, colour = ID)) +
      geom_line() +
      scale_color_manual(values = myblues) +
      theme_bw() +
      theme(legend.position = "none") +
      xlab(bquote(b[pk]))
  }

  if (plot_biophase) {
    list(AUC_H, 1 / ii, time_plot, apd_plot, bpd_plot)
  } else {
    list(AUC_H, 1 / ii, time_plot)
  }
}

# ─── bode_plot() ────────────────────────────────────────────────────────────────
bode_plot <- function(
    seq_1 = 0.00025,
    seq_2 = 0.006,
    gg_ylim = NA,
    palette = myblues,
    ...) {
  freqs <- seq(seq_1, seq_2, by = seq_1)
  intervals <- 1 / freqs

  bode_df <- tibble()
  H_list <- list()

  for (i in seq_along(intervals)) {
    res <- opponentprocess(ii = intervals[i], plot_biophase = TRUE, ...)
    bode_df <- bind_rows(bode_df, res[[1]])
    H_list[[i]] <- res[[3]]
    if (i == 1) {
      apd_plot <- res[[4]]
      bpd_plot <- res[[5]]
    }
  }

  bode_graph <- bode_df %>%
    ggplot(aes(freq, AUC, colour = factor(ID))) +
    geom_hline(yintercept = 0, linetype = "dashed") +
    geom_line() +
    scale_color_manual(values = palette) +
    {
      if (!is.na(gg_ylim)) coord_cartesian(ylim = c(gg_ylim, NA))
    } +
    xlab(bquote(f ~ "(min"^-1 * ")")) +
    ylab(bquote(integral(H[a * "," * b], 0, t ~ dt))) +
    theme_bw() +
    theme(legend.position = "none")

  # layout: PD curves / first+last H / Bode
  print(
    (apd_plot | bpd_plot) /
      (H_list[[1]] | H_list[[length(H_list)]]) /
      bode_graph
  )
}

# ─── Shiny UI & Server ─────────────────────────────────────────────────────────
ui <- fluidPage(
  titlePanel("Behavioral Frequency‐Response"),
  sidebarLayout(
    sidebarPanel(
      tabsetPanel(
        id = "tabs", type = "tabs",
        tabPanel(
          "PK/PD",
          sliderInput("k_DB", "k_DB", min = 0, max = 20, value = 10, step = 0.1),
          sliderInput("k_apk", "k_apk", min = 0, max = 1, value = 0.02, step = 0.001),
          sliderInput("k_bpk", "k_bpk", min = 0, max = 1, value = 0.004, step = 0.001),
          sliderInput("Emax_a", "Emax_a", min = 0, max = 5, value = 1, step = 0.1),
          sliderInput("EC50_a", "EC50_a", min = 0.1, max = 10, value = 1, step = 0.1),
          sliderInput("gamma_a", "γ_a", min = 1, max = 4, value = 2, step = 0.1),
          sliderInput("Emax_b", "Emax_b", min = 0, max = 5, value = 1, step = 0.1),
          sliderInput("EC50_b", "EC50_b", min = 0.1, max = 50, value = 3, step = 0.1),
          sliderInput("gamma_b", "γ_b", min = 1, max = 4, value = 2, step = 0.1)
        ),
        tabPanel(
          "Dosing",
          sliderInput("ii", "Dosing interval (min)", min = 1, max = 200000, value = 100000, step = 1000),
          numericInput("sim_length", "Sim length (min)", value = 4000, min = 100, max = 20000, step = 100),
          numericInput("infuse", "Infusion dur", value = 1, min = 0.1, max = 10, step = 0.1)
        ),
        tabPanel(
          "Frequency Scan",
          sliderInput("seq_1", "Min freq step", min = 0.0001, max = 0.01, value = 0.00025, step = 0.0001),
          sliderInput("seq_2", "Max freq", min = 0.001, max = 0.2, value = 0.006, step = 0.001),
          numericInput("gg_ylim", "Bode Y‐min", value = NA)
        )
      )
    ),
    mainPanel(
      tabsetPanel(
        tabPanel("Time series", plotOutput("timeSeriesPlot", height = "500px")),
        tabPanel("Bode plot", plotOutput("bodePlot", height = "500px")),
        tabPanel(
          "Biophase", plotOutput("apdPlot", height = "300px"),
          plotOutput("bpdPlot", height = "300px")
        )
      )
    )
  )
)

server <- function(input, output) {
  sim <- reactive({
    opponentprocess(
      ii = input$ii,
      sim_length = input$sim_length,
      plot_biophase = TRUE,
      k_DB = input$k_DB,
      k_apk = input$k_apk,
      k_bpk = input$k_bpk,
      E0_a = 0, Emax_a = input$Emax_a, EC50_a = input$EC50_a, gamma_a = input$gamma_a,
      E0_b = 0, Emax_b = input$Emax_b, EC50_b = input$EC50_b, gamma_b = input$gamma_b,
      infuse = input$infuse
    )
  })

  output$timeSeriesPlot <- renderPlot({
    print(sim()[[3]])
  })
  output$apdPlot <- renderPlot({
    print(sim()[[4]])
  })
  output$bpdPlot <- renderPlot({
    print(sim()[[5]])
  })
  output$bodePlot <- renderPlot({
    bode_plot(
      seq_1 = input$seq_1,
      seq_2 = input$seq_2,
      gg_ylim = input$gg_ylim,
      palette = myblues,
      k_DB = input$k_DB,
      k_apk = input$k_apk,
      k_bpk = input$k_bpk,
      E0_a = 0, Emax_a = input$Emax_a, EC50_a = input$EC50_a, gamma_a = input$gamma_a,
      E0_b = 0, Emax_b = input$Emax_b, EC50_b = input$EC50_b, gamma_b = input$gamma_b,
      infuse = input$infuse
    )
  })
}

shinyApp(ui, server)
