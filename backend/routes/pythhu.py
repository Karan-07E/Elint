import random
import matplotlib.pyplot as plt
from collections import deque
from colorama import Fore, Style, init

# Initialize colorama for colored text
init(autoreset=True)

class TLBSimulator:
    def __init__(self, tlb_size, page_size=1024):
        self.tlb_size = tlb_size
        self.page_size = page_size
        self.tlb_cache = deque(maxlen=tlb_size)
        self.hits = 0
        self.misses = 0

    def access_memory(self, virtual_address):
        # Calculate Page Number
        page_number = virtual_address // self.page_size
        
        status = "MISS"
        
        # Check TLB
        if page_number in self.tlb_cache:
            status = "HIT"
            self.hits += 1
            # Update LRU (move to newest position)
            self.tlb_cache.remove(page_number)
            self.tlb_cache.append(page_number)
        else:
            self.misses += 1
            # Add to TLB (automatically removes oldest if full)
            self.tlb_cache.append(page_number)
            
        return page_number, status

    def get_tlb_state(self):
        return list(self.tlb_cache)

# --- PART 1: DETAILED TEXT LOGGING ---
def run_detailed_trace():
    print(Fore.CYAN + Style.BRIGHT + "\n" + "="*60)
    print(" PART 1: DETAILED STEP-BY-STEP TRACE")
    print(" (Visualizing Hits, Misses, and Evictions)")
    print("="*60)
    
    # Config for the trace
    sim = TLBSimulator(tlb_size=4) # Small TLB to force evictions
    
    # Specific sequence to demonstrate locality
    # Addresses map to pages: 0, 0, 1, 0, 2, 3, 4 (evict 0?), 1, 0
    addresses = [100, 105, 2000, 100, 3000, 4000, 5000, 2000, 105, 6000]
    
    # Print Header
    header = f"{'Virt Addr':<10} | {'Page #':<8} | {'Status':<8} | {'TLB State (Pages in Cache)'}"
    print(Style.BRIGHT + header)
    print("-" * 60)

    for addr in addresses:
        page, status = sim.access_memory(addr)
        tlb_state = sim.get_tlb_state()
        
        # Color Logic
        if status == "HIT":
            status_str = Fore.GREEN + "HIT " + Style.RESET_ALL
        else:
            status_str = Fore.RED + "MISS" + Style.RESET_ALL
            
        print(f"{addr:<10} | {page:<8} | {status_str:<8} | {str(tlb_state)}")

    # Summary
    total = sim.hits + sim.misses
    ratio = (sim.hits / total) * 100
    print("-" * 60)
    print(f"Final Stats: Hits: {sim.hits} | Misses: {sim.misses} | Ratio: {ratio:.2f}%")
    print("-" * 60 + "\n")

# --- PART 2: GRAPHICAL ANALYSIS ---
def run_graphical_analysis():
    print(Fore.CYAN + Style.BRIGHT + "="*60)
    print(" PART 2: PERFORMANCE ANALYSIS (GENERATING GRAPH)")
    print("="*60)
    print("Running bulk simulation on different TLB sizes...")

    tlb_sizes = range(1, 21)
    hit_ratios = []
    
    # Simulation Data
    TOTAL_PAGES = 50
    ACCESS_COUNT = 1000
    # Create a traffic pattern with "Hot Pages" (Locality of Reference)
    hot_pages = [random.randint(0, TOTAL_PAGES) for _ in range(10)]
    traffic = []
    for _ in range(ACCESS_COUNT):
        if random.random() < 0.85: # 85% chance to access a "Hot Page"
            traffic.append(random.choice(hot_pages) * 1024)
        else:
            traffic.append(random.randint(0, TOTAL_PAGES) * 1024)

    # Run experiment for each TLB size
    for size in tlb_sizes:
        sim = TLBSimulator(tlb_size=size)
        for addr in traffic:
            sim.access_memory(addr)
        
        total = sim.hits + sim.misses
        ratio = (sim.hits / total) * 100
        hit_ratios.append(ratio)
        
        # Progress Bar in Terminal
        bar = "█" * int(ratio/5)
        print(f"Size {size:02d}: {bar} {ratio:.1f}%")

    print(Fore.GREEN + "\nExperiment Finished. Opening Graph...")

    # Plotting
    plt.figure(figsize=(10, 6))
    plt.plot(tlb_sizes, hit_ratios, marker='o', color='#2ecc71', linewidth=2.5)
    plt.title('TLB Hit Ratio Analysis', fontsize=16, fontweight='bold')
    plt.xlabel('TLB Size (Number of Entries)', fontsize=12)
    plt.ylabel('Hit Ratio (%)', fontsize=12)
    plt.grid(True, linestyle='--', alpha=0.6)
    plt.axhline(y=85, color='r', linestyle=':', label='Theoretical Max (Locality Limit)')
    plt.legend()
    plt.show()

if __name__ == "__main__":
    run_detailed_trace()
    input(Fore.YELLOW + "Press Enter to start the Graphical Analysis...")
    run_graphical_analysis()